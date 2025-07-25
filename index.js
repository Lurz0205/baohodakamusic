// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const http = require('http');
const WebSocket = require('ws'); // Đảm bảo import ws

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

    console.log('Bắt đầu khởi tạo Discord Player...');
    const player = new Player(client, {
        ytdlOptions: {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25,
        },
        nodes: config.LAVALINK_NODES, // Cấu hình nodes trực tiếp trong constructor
        // Thêm tùy chọn để debug sâu hơn nếu cần
        // debug: true, // Bật debug của discord-player (sẽ log rất nhiều)
    });
    console.log('Discord Player đã được khởi tạo.');

    // Đặt listener debug ngay sau khi player được khởi tạo
    player.events.on('debug', (queue, message) => {
        // Lọc các tin nhắn debug để tránh quá tải log, chỉ hiển thị những cái quan trọng
        if (message.includes('Node') || message.includes('WebSocket') || message.includes('Connection') || message.includes('Error') || message.includes('Lavalink')) {
            console.log(`[DEBUG PLAYER] ${message}`);
        }
    });

    console.log(`Đang cấu hình ${config.LAVALINK_NODES.length} Lavalink nodes.`);
    // Log trạng thái player.nodes.cache ngay sau khởi tạo để xem nó có rỗng không
    console.log(`Số lượng node trong player.nodes.cache sau khởi tạo: ${player.nodes.cache.size}`);


    try {
        await player.extractors.loadMulti(DefaultExtractors);
        console.log('Đã tải tất cả DefaultExtractors.');
    } catch (e) {
        console.error('Lỗi khi tải extractors:', e);
    }

    // Xử lý các sự kiện của Discord Player
    fs.readdirSync(path.join(__dirname, 'events', 'discord-player')).forEach(file => {
        const event = require(path.join(__dirname, 'events', 'discord-player', file));
        if (event.name) {
            player.events.on(event.name, (...args) => event.execute(...args));
        }
    });

    // Các sự kiện Lavalink Node (quan trọng để debug kết nối)
    player.events.on('nodeConnect', (node) => {
        console.log(`✅ Lavalink node ${node.id} (${node.host}:${node.port}) đã kết nối thành công.`);
    });

    player.events.on('nodeError', (node, error) => {
        console.error(`❌ Lỗi từ Lavalink node ${node.id} (${node.host}:${node.port}):`, error.message);
        if (error.message.includes('403 Forbidden') || error.message.includes('Unauthorized')) {
            console.error(`⚠️ Lỗi xác thực (403 Forbidden) cho node ${node.id}. Vui lòng kiểm tra lại mật khẩu (authorization) của node này trong config.js.`);
        } else if (error.message.includes('ECONNREFUSED')) {
            console.error(`⚠️ Kết nối bị từ chối cho node ${node.id}. Node có thể đang offline hoặc tường lửa chặn.`);
        } else if (error.message.includes('ETIMEDOUT')) {
            console.error(`⚠️ Hết thời gian chờ kết nối cho node ${node.id}. Vấn đề mạng hoặc node quá tải.`);
        } else {
            console.error(`⚠️ Lỗi không xác định từ node ${node.id}: ${error.message}`);
        }
    });

    player.events.on('nodeDisconnect', (node, reason) => {
        console.warn(`❌ Lavalink node ${node.id} (${node.host}:${node.port}) đã ngắt kết nối. Lý do: ${reason?.code || 'Không rõ'}`);
    });

    player.events.on('nodesDestroy', (queue) => {
        console.warn(`Tất cả Lavalink node đã bị hủy hoặc ngắt kết nối. Hàng chờ trong guild ${queue.guild.name} sẽ bị xóa.`);
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

    client.once('ready', async () => { // Đã thêm async
        console.log('Client đã sẵn sàng. Đang kiểm tra Lavalink nodes...');

        // Đợi một chút để player có thời gian khởi tạo kết nối
        await new Promise(resolve => setTimeout(resolve, 3000)); // Đợi 3 giây

        const connectedNodes = player.nodes.cache.filter(n => n.connected).size;
        console.log(`Sau khi chờ, có ${connectedNodes} Lavalink node đang kết nối.`);

        if (connectedNodes < 2) {
            console.warn('Cảnh báo: Ít hơn 2 Lavalink node đang hoạt động. Có thể ảnh hưởng đến độ ổn định.');
        }

        // THÊM: Kiểm tra kết nối WebSocket trực tiếp đến node đầu tiên
        // Đảm bảo ws được import và node đầu tiên tồn tại
        if (config.LAVALINK_NODES.length > 0) {
            const firstNode = config.LAVALINK_NODES[0];
            const wsUrl = `${firstNode.secure ? 'wss' : 'ws'}://${firstNode.host}:${firstNode.port}/v4/websocket`;
            const headers = {
                'Authorization': firstNode.authorization,
                'User-Id': client.user.id,
                'Client-Name': client.user.username
            };

            console.log(`Đang thử kết nối WebSocket trực tiếp đến: ${wsUrl}`);
            console.log(`Với headers: ${JSON.stringify(headers)}`);

            try {
                const ws = new WebSocket(wsUrl, { headers: headers });

                ws.onopen = () => {
                    console.log(`[WEBSOCKET TEST] ✅ Kết nối WebSocket trực tiếp đến ${wsUrl} thành công.`);
                    ws.close(); // Đóng kết nối sau khi kiểm tra
                };

                ws.onerror = (error) => {
                    console.error(`[WEBSOCKET TEST] ❌ Lỗi kết nối WebSocket trực tiếp đến ${wsUrl}:`, error.message);
                    if (error.code) console.error(`[WEBSOCKET TEST] Mã lỗi: ${error.code}`);
                };

                ws.onclose = (code, reason) => {
                    console.log(`[WEBSOCKET TEST] Kết nối WebSocket trực tiếp đến ${wsUrl} đã đóng. Mã: ${code}, Lý do: ${reason.toString()}`);
                };
            } catch (wsError) {
                console.error(`[WEBSOCKET TEST] Lỗi khi khởi tạo WebSocket:`, wsError.message);
            }
        } else {
            console.warn('Không có Lavalink node nào được cấu hình để thực hiện kiểm tra WebSocket trực tiếp.');
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
