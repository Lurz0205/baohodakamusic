// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
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

    const player = new Player(client, {
        ytdlOptions: {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25,
        },
        nodes: config.LAVALINK_NODES,
    });

    console.log(`Đang cấu hình ${config.LAVALINK_NODES.length} Lavalink nodes.`);

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
        }
    });

    player.events.on('nodeDisconnect', (node, reason) => {
        console.warn(`⚠️ Lavalink node ${node.id} (${node.host}:${node.port}) đã ngắt kết nối. Lý do: ${reason?.code || 'Không rõ'}`);
    });

    player.events.on('nodesDestroy', (queue) => {
        console.warn(`Tất cả Lavalink node đã bị hủy hoặc ngắt kết nối. Hàng chờ trong guild ${queue.guild.name} sẽ bị xóa.`);
    });

    player.events.on('debug', (queue, message) => {
        if (message.includes('Node') || message.includes('WebSocket') || message.includes('Connection') || message.includes('Error')) {
            console.log(`[DEBUG PLAYER] ${message}`);
        }
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

    // ĐÃ THÊM: Hàm để chủ động kết nối các Lavalink nodes
    async function connectLavalinkNodes() {
        console.log('Đang cố gắng kết nối các Lavalink nodes...');
        for (const nodeConfig of config.LAVALINK_NODES) {
            try {
                // Kiểm tra xem node đã được thêm vào player.nodes.cache chưa
                let node = player.nodes.cache.get(nodeConfig.id);
                if (!node) {
                    // Nếu chưa có, thêm node vào player (nếu discord-player cho phép thêm thủ công)
                    // Trong v7.x, nodes thường được thêm qua constructor.
                    // Nếu node chưa kết nối, player sẽ tự động thử kết nối.
                    console.log(`Node ${nodeConfig.id} chưa có trong cache, player sẽ tự động thử kết nối.`);
                    // player.nodes.add(nodeConfig); // Phương thức này không có trong v7.x
                    // Vì nodes đã được truyền vào constructor, player sẽ quản lý việc kết nối.
                    // Chúng ta chỉ cần đợi các sự kiện nodeConnect/nodeError
                } else if (!node.connected) {
                    // Nếu node đã có nhưng chưa kết nối, log để theo dõi
                    console.log(`Node ${nodeConfig.id} đã có trong cache nhưng chưa kết nối. Đang chờ player xử lý.`);
                } else {
                    console.log(`Node ${nodeConfig.id} đã kết nối.`);
                }
            } catch (error) {
                console.error(`Lỗi khi xử lý node ${nodeConfig.id}:`, error.message);
            }
        }
        // Cho một khoảng thời gian để các kết nối được thiết lập
        setTimeout(() => {
            const connectedNodes = player.nodes.cache.filter(n => n.connected).size;
            console.log(`Sau khi kiểm tra, có ${connectedNodes} Lavalink node đang kết nối.`);
            if (connectedNodes < 2) {
                console.warn('Cảnh báo: Ít hơn 2 Lavalink node đang hoạt động. Có thể ảnh hưởng đến độ ổn định.');
            }
        }, 5000); // Đợi 5 giây để các kết nối có thời gian thiết lập
    }

    client.once('ready', () => {
        console.log('Client đã sẵn sàng. Đang kiểm tra Lavalink nodes...');
        connectLavalinkNodes(); // Gọi hàm kiểm tra và kết nối nodes
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
