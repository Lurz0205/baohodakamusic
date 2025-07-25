// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Player } = require('discord-player'); // discord-player v6.x
const fs = require('fs');
const path = require('path');
const config = require('./config');
const http = require('http');

// Bọc toàn bộ logic khởi tạo bot trong một hàm async IIFE để sử dụng await
(async () => {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.MessageContent
        ]
    });

    client.commands = new Collection();
    client.config = config;

    // Khởi tạo Discord Player cho v6.x
    const player = new Player(client, {
        ytdlOptions: {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25,
        },
        nodes: config.LAVALINK_NODES, // Truyền các node đã cấu hình
        autoRegisterExtractor: false, // Tắt tự động đăng ký extractor để kiểm soát thủ công
    });

    // Các sự kiện của Discord Player (v6.x)
    player.on('error', (queue, error) => {
        console.error(`[PLAYER ERROR] Lỗi từ queue ${queue.guild.name}: ${error.message}`);
        if (queue.metadata && queue.metadata.channel) {
            queue.metadata.channel.send(`Đã xảy ra lỗi khi phát nhạc: ${error.message}`).catch(e => console.error("Lỗi khi gửi tin nhắn lỗi:", e));
        }
    });

    player.on('debug', (message) => {
        // Chỉ log các tin nhắn debug quan trọng hơn để tránh quá tải log
        if (message.includes('Node') || message.includes('WebSocket') || message.includes('Connection')) {
            console.log(`[DEBUG PLAYER] ${message}`);
        }
    });

    player.on('nodeConnect', (node) => {
        console.log(`✅ Lavalink node ${node.host}:${node.port} đã kết nối thành công.`);
    });

    player.on('nodeError', (node, error) => {
        console.error(`❌ Lỗi từ Lavalink node ${node.host}:${node.port}:`, error.message);
        if (error.message.includes('403 Forbidden') || error.message.includes('Unauthorized')) {
            console.error(`⚠️ Lỗi xác thực (403 Forbidden) cho node ${node.host}. Vui lòng kiểm tra lại mật khẩu (password) của node này trong config.js.`);
        }
    });

    player.on('nodeDisconnect', (node, reason) => {
        console.warn(`⚠️ Lavalink node ${node.host}:${node.port} đã ngắt kết nối. Lý do: ${reason?.code || 'Không rõ'}`);
    });

    player.on('trackStart', (queue, track) => {
        console.log(`🎶 Đang phát: ${track.title} trên guild ${queue.guild.id}`);
        if (queue.metadata && queue.metadata.channel) {
            queue.metadata.channel.send({
                embeds: [{
                    title: `▶️ Bắt đầu phát: ${track.title}`,
                    description: `Thời lượng: ${track.duration}\nKênh: ${track.author}\nNguồn: ${track.source}`,
                    url: track.url,
                    thumbnail: { url: track.thumbnail },
                    color: client.config.EMBED_COLOR,
                    footer: {
                        text: `Yêu cầu bởi: ${track.requestedBy.tag}`,
                        icon_url: track.requestedBy.displayAvatarURL({ dynamic: true })
                    }
                }]
            }).catch(console.error);
        } else {
            console.warn('Không tìm thấy kênh để gửi thông báo trackStart. Metadata hoặc channel bị thiếu.');
        }
    });

    player.on('queueEnd', (queue) => {
        console.log(`Hàng chờ kết thúc trên guild ${queue.guild.id}`);
        if (queue.metadata && queue.metadata.channel) {
            queue.metadata.channel.send('Hàng chờ đã kết thúc. Rời kênh thoại.').catch(console.error);
        } else {
            console.warn('Không tìm thấy kênh để gửi thông báo queueEnd. Metadata hoặc channel bị thiếu.');
        }
        queue.destroy(); // Hủy queue và rời kênh thoại
    });

    // Tải các lệnh Slash Commands
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`[WARNING] Lệnh tại ${filePath} thiếu thuộc tính "data" hoặc "execute" bắt buộc.`);
        }
    }

    // Tải các sự kiện của Client (như ready)
    const clientEventsPath = path.join(__dirname, 'events', 'client');
    const clientEventFiles = fs.readdirSync(clientEventsPath).filter(file => file.endsWith('.js'));

    for (const file of clientEventFiles) {
        const filePath = path.join(clientEventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }

    // Xử lý tương tác lệnh Slash
    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Không tìm thấy lệnh ${interaction.commandName}.`);
            return;
        }

        try {
            await command.execute(interaction, player, client);
        } catch (error) {
            console.error(error);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: 'Có lỗi xảy ra khi thực hiện lệnh này!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Có lỗi xảy ra khi thực hiện lệnh này!', ephemeral: true });
            }
        }
    });

    client.login(config.BOT_TOKEN);

    const PORT = process.env.PORT || 3000;
    const server = http.createServer((req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Discord Music Bot is running!\n');
    });

    server.listen(PORT, () => {
        console.log(`Server HTTP đang lắng nghe trên cổng ${PORT} để giữ bot online.`);
    });

})();
