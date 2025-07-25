// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
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

    // Khởi tạo Discord Player
    const player = new Player(client, {
        ytdlOptions: {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25,
        },
        nodes: config.LAVALINK_NODES, // Cấu hình nodes TRỰC TIẾP trong constructor
    });

    // Đặt listener debug ngay sau khi player được khởi tạo
    player.events.on('debug', (queue, message) => {
        console.log(`[DEBUG] ${message}`);
    });

    // Logging để kiểm tra xem Lavalink nodes có được đọc từ config không
    console.log(`Đang cấu hình ${config.LAVALINK_NODES.length} Lavalink nodes.`);
    console.log('Trạng thái player.nodes ngay sau khởi tạo:', player.nodes);
    console.log('Số lượng node trong player.nodes.cache (sau khởi tạo):', player.nodes.cache.size);


    // Đảm bảo extractors được tải đúng cách
    try {
        await player.extractors.loadMulti(DefaultExtractors);
        // Gỡ đăng ký SoundCloudExtractor một cách rõ ràng
        player.extractors.unregister('SoundCloudExtractor');
        console.log('Đã gỡ đăng ký SoundCloudExtractor.');
        console.log('Đã tải và lọc DefaultExtractors.');
    } catch (e) {
        console.error('Lỗi khi tải hoặc gỡ đăng ký extractors:', e);
    }


    // Xử lý các sự kiện của Discord Player
    fs.readdirSync(path.join(__dirname, 'events', 'discord-player')).forEach(file => {
        const event = require(path.join(__dirname, 'events', 'discord-player', file));
        if (event.name) {
            player.events.on(event.name, (...args) => event.execute(...args));
        }
    });

    // Các sự kiện Lavalink
    player.events.on('nodeError', (node, error) => {
        console.error(`Lỗi từ Lavalink node ${node.id}:`, error);
    });

    player.events.on('nodesDestroy', (queue) => {
        console.warn(`Tất cả Lavalink node đã bị hủy hoặc ngắt kết nối. Hàng chờ trong guild ${queue.guild.name} sẽ bị xóa.`);
    });

    player.events.on('nodeConnect', (node) => {
        console.log(`✅ Lavalink node ${node.id} (${node.host}:${node.port}) đã kết nối thành công.`);
    });

    player.events.on('nodeDisconnect', (node, reason) => {
        console.warn(`❌ Lavalink node ${node.id} (${node.host}:${node.port}) đã ngắt kết nối. Lý do: ${reason?.code || 'Không rõ'}`);
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
            // ĐÃ SỬA: Xử lý lỗi tương tác để tránh "Interaction has already been acknowledged."
            if (interaction.deferred || interaction.replied) {
                // Nếu đã defer hoặc reply, dùng followUp
                await interaction.followUp({ content: 'Có lỗi xảy ra khi thực hiện lệnh này!', ephemeral: true }).catch(e => console.error('Lỗi khi followUp:', e));
            } else {
                // Nếu chưa, dùng reply
                await interaction.reply({ content: 'Có lỗi xảy ra khi thực hiện lệnh này!', ephemeral: true }).catch(e => console.error('Lỗi khi reply:', e));
            }
        }
    });

    client.login(config.BOT_TOKEN);

    // Kiểm tra Lavalink nodes sau khi bot đã sẵn sàng
    client.once('ready', () => {
        console.log('Client đã sẵn sàng. Đang kiểm tra Lavalink nodes...');
        // ĐÃ XÓA: Loại bỏ hoàn toàn logic buộc kết nối Lavalink vì nó không hoạt động như mong đợi
        /*
        if (player.nodes.manager && player.nodes.manager.nodes.size > 0) {
            console.log('Đang cố gắng kết nối các Lavalink nodes đã cấu hình...');
            player.nodes.manager.nodes.forEach(node => {
                if (!node.connected) {
                    try {
                        node.connect();
                        console.log(`Đã gửi yêu cầu kết nối cho node ${node.id}`);
                    } catch (connectError) {
                        console.error(`Lỗi khi cố gắng kết nối node ${node.id}:`, connectError);
                    }
                }
            });
        } else {
            console.warn('Không có Lavalink node nào được cấu hình trong player.nodes.manager.nodes. Vui lòng kiểm tra config.js.');
        }
        */

        // ĐÃ SỬA: Log trạng thái các node đã cấu hình ban đầu từ config
        if (config.LAVALINK_NODES.length === 0) {
            console.warn('Không có Lavalink node nào được cấu hình trong config.js.');
        } else {
            console.log(`Tìm thấy ${config.LAVALINK_NODES.length} Lavalink nodes được cấu hình.`);
            config.LAVALINK_NODES.forEach((nodeConfig, index) => {
                // Chúng ta không thể biết trạng thái kết nối ở đây nếu không có API để buộc kết nối
                console.log(`Node cấu hình ${index + 1}: Host: ${nodeConfig.host}:${nodeConfig.port}`);
            });
        }

        // Log trạng thái cache (chỉ chứa các node đã kết nối)
        if (player.nodes.cache.size === 0) {
            console.warn('Hiện tại không có Lavalink node nào đang kết nối trong cache của player. Bot sẽ cố gắng kết nối khi có yêu cầu phát nhạc.');
        } else {
            console.log(`Tìm thấy ${player.nodes.cache.size} Lavalink nodes đang kết nối trong cache.`);
            player.nodes.cache.forEach(node => {
                console.log(`Node ${node.id}: Host: ${node.host}:${node.port}, Kết nối: ${node.connected ? '✅' : '❌'}`);
            });
        }
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
