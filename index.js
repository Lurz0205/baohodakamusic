// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { LavalinkManager } = require('lavalink-client');
const { joinVoiceChannel } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const http = require('http');

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

    let lavalink; // Khai báo biến lavalink ở phạm vi này

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

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Không tìm thấy lệnh ${interaction.commandName}.`);
            return;
        }

        try {
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

        lavalink = new LavalinkManager({
            nodes: config.LAVALINK_NODES,
            sendToShard: (guildId, payload) => {
                const guild = client.guilds.cache.get(guildId);
                if (guild) guild.shard.send(payload);
            },
            client: {
                id: client.user.id,
                username: client.user.username,
            },
            autoSkip: true,
        });

        lavalink.init({ id: client.user.id, username: client.user.username });

        // Đăng ký các sự kiện của LavalinkManager
        lavalink.on('nodeConnect', (node) => {
            console.log(`✅ Lavalink node ${node.id} (${node.host}:${node.port}) đã kết nối thành công.`);
            console.log(`Hiện có ${lavalink.nodes.filter(n => n.connected).size} node Lavalink đang kết nối.`);
        });

        lavalink.on('nodeError', (node, error) => {
            console.error(`❌ Lỗi từ Lavalink node ${node.id}:`, error.message);
            // THÊM: Log chi tiết hơn về lỗi xác thực
            if (error.message.includes('403 Forbidden') || error.message.includes('Unauthorized')) {
                console.error(`⚠️ Lỗi xác thực (403 Forbidden) cho node ${node.id}. Vui lòng kiểm tra lại mật khẩu (authorization) của node này trong config.js. Mật khẩu Lavalink thường là một chuỗi ký tự, không phải URL Discord.`);
            }
        });

        lavalink.on('nodeDisconnect', (node, reason) => {
            console.warn(`⚠️ Lavalink node ${node.id} (${node.host}:${node.port}) đã ngắt kết nối. Lý do: ${reason?.code || 'Không rõ'}`);
        });

        lavalink.on('trackStart', (player, track) => {
            console.log(`🎶 Đang phát: ${track.info.title} trên guild ${player.guildId}`);
            if (player.textChannelId) {
                client.channels.cache.get(player.textChannelId)?.send(`🎶 Đang phát: **${track.info.title}**`);
            }
        });

        lavalink.on('queueEnd', (player) => {
            console.log(`Hàng chờ kết thúc trên guild ${player.guildId}`);
            if (player.textChannelId) {
                client.channels.cache.get(player.textChannelId)?.send('Hàng chờ đã kết thúc. Rời kênh thoại.');
            }
            player.destroy();
        });

        lavalink.on('playerCreate', (player) => {
            console.log(`Player được tạo cho guild ${player.guildId}`);
        });

        lavalink.on('playerDestroy', (player) => {
            console.log(`Player bị hủy cho guild ${player.guildId}`);
        });

        // ĐÃ SỬA: Log trạng thái nodes ngay sau init() với optional chaining
        console.log(`Đã khởi tạo Lavalink Manager với ${lavalink.nodes?.size || 0} node được cấu hình.`);
        lavalink.nodes?.forEach(node => {
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
