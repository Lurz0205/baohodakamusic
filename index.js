// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { LavalinkManager } = require('lavalink-client'); // Import LavalinkManager
const { joinVoiceChannel } = require('@discordjs/voice'); // Cần cho kết nối thoại
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

    // Khởi tạo LavalinkManager
    const lavalink = new LavalinkManager({
        nodes: config.LAVALINK_NODES, // Cấu hình các Lavalink nodes từ config
        sendToShard: (guildId, payload) => {
            // Hàm này được LavalinkManager sử dụng để gửi dữ liệu đến Discord
            const guild = client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        },
        client: {
            id: client.user.id,
            username: client.user.username,
        },
        autoSkip: true, // Tự động bỏ qua bài hát khi kết thúc
        // Thêm các tùy chọn khác nếu cần, ví dụ:
        // defaultSearchEngine: 'youtube',
    });

    // Đăng ký các sự kiện của LavalinkManager
    lavalink.on('nodeConnect', (node) => {
        console.log(`✅ Lavalink node ${node.id} (${node.host}:${node.port}) đã kết nối thành công.`);
    });

    lavalink.on('nodeError', (node, error) => {
        console.error(`❌ Lỗi từ Lavalink node ${node.id}:`, error.message);
    });

    lavalink.on('nodeDisconnect', (node, reason) => {
        console.warn(`⚠️ Lavalink node ${node.id} (${node.host}:${node.port}) đã ngắt kết nối. Lý do: ${reason?.code || 'Không rõ'}`);
    });

    lavalink.on('trackStart', (player, track) => {
        console.log(`🎶 Đang phát: ${track.title} trên guild ${player.guildId}`);
        // Bạn có thể gửi tin nhắn thông báo bài hát đang phát tại đây
        // Ví dụ: client.channels.cache.get(player.textChannelId).send(`🎶 Đang phát: **${track.title}**`);
    });

    lavalink.on('queueEnd', (player) => {
        console.log(`Hàng chờ kết thúc trên guild ${player.guildId}`);
        // Bạn có thể ngắt kết nối kênh thoại khi hàng chờ kết thúc
        // player.destroy();
    });

    lavalink.on('playerCreate', (player) => {
        console.log(`Player được tạo cho guild ${player.guildId}`);
    });

    lavalink.on('playerDestroy', (player) => {
        console.log(`Player bị hủy cho guild ${player.guildId}`);
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
            // Truyền instance của LavalinkManager vào lệnh
            await command.execute(interaction, lavalink, client);
        } catch (error) {
            console.error(error);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: 'Có lỗi xảy ra khi thực hiện lệnh này!', ephemeral: true }).catch(e => console.error('Lỗi khi followUp:', e));
            } else {
                await interaction.reply({ content: 'Có lỗi xảy ra khi thực hiện lệnh này!', ephemeral: true }).catch(e => console.error('Lỗi khi reply:', e));
            }
        }
    });

    client.login(config.BOT_TOKEN);

    client.once('ready', () => {
        console.log('Client đã sẵn sàng. Đang khởi tạo Lavalink Manager...');
        lavalink.init({ id: client.user.id, username: client.user.username }); // Khởi tạo Lavalink Manager
        console.log(`Đã khởi tạo Lavalink Manager với ${lavalink.nodes.size} node.`);

        // Log trạng thái kết nối của các node Lavalink
        lavalink.nodes.forEach(node => {
            console.log(`Node ${node.id}: Host: ${node.host}:${node.port}, Trạng thái: ${node.connected ? '✅ Đã kết nối' : '❌ Ngắt kết nối'}`);
        });
    });


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
