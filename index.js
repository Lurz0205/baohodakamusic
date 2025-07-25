// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const http = require('http');
const { LavalinkManager } = require('lavalink-client');

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
        nodes: config.LAVALINK_NODES,
    });
    console.log('Discord Player đã được khởi tạo.');

    player.events.on('debug', (queue, message) => {
        if (message.includes('Node') || message.includes('WebSocket') || message.includes('Connection') || message.includes('Error') || message.includes('Lavalink')) {
            console.log(`[DEBUG PLAYER] ${message}`);
        }
    });

    console.log(`Đang cấu hình ${config.LAVALINK_NODES.length} Lavalink nodes cho Discord Player.`);

    try {
        await player.extractors.loadMulti(DefaultExtractors);
        console.log('Đã tải tất cả DefaultExtractors.');
    } catch (e) {
        console.error('Lỗi khi tải extractors:', e);
    }

    fs.readdirSync(path.join(__dirname, 'events', 'discord-player')).forEach(file => {
        const event = require(path.join(__dirname, 'events', 'discord-player', file));
        if (event.name) {
            player.events.on(event.name, (...args) => event.execute(...args));
        }
    });

    player.events.on('nodeConnect', (node) => {
        console.log(`[DISCORD-PLAYER] ✅ Lavalink node ${node.id} (${node.host}:${node.port}) đã kết nối thành công.`);
    });

    player.events.on('nodeError', (node, error) => {
        console.error(`[DISCORD-PLAYER] ❌ Lỗi từ Lavalink node ${node.id} (${node.host}:${node.port}):`, error.message);
        if (error.message.includes('403 Forbidden') || error.message.includes('Unauthorized')) {
            console.error(`[DISCORD-PLAYER] ⚠️ Lỗi xác thực (403 Forbidden) cho node ${node.id}. Vui lòng kiểm tra lại mật khẩu (authorization) của node này trong config.js.`);
        } else if (error.message.includes('ECONNREFUSED')) {
            console.error(`[DISCORD-PLAYER] ⚠️ Kết nối bị từ chối cho node ${node.id}. Node có thể đang offline hoặc tường lửa chặn.`);
        } else if (error.message.includes('ETIMEDOUT')) {
            console.error(`[DISCORD-PLAYER] ⚠️ Hết thời gian chờ kết nối cho node ${node.id}. Vấn đề mạng hoặc node quá tải.`);
        } else {
            console.error(`[DISCORD-PLAYER] ⚠️ Lỗi không xác định từ node ${node.id}: ${error.message}`);
        }
    });

    player.events.on('nodeDisconnect', (node, reason) => {
        console.warn(`[DISCORD-PLAYER] ❌ Lavalink node ${node.id} (${node.host}:${node.port}) đã ngắt kết nối. Lý do: ${reason?.code || 'Không rõ'}`);
    });

    player.events.on('nodesDestroy', (queue) => {
        console.warn(`[DISCORD-PLAYER] Tất cả Lavalink node đã bị hủy hoặc ngắt kết nối. Hàng chờ trong guild ${queue.guild.name} sẽ bị xóa.`);
    });

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

    client.once('ready', async () => {
        console.log('Client đã sẵn sàng. Đang kiểm tra Lavalink nodes...');

        // THÊM: Khởi tạo và kiểm tra Lavalink nodes bằng lavalink-client độc lập
        const lavalinkTester = new LavalinkManager({
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

        lavalinkTester.on('nodeConnect', (node) => {
            console.log(`[LAVALINK-TESTER] ✅ Node ${node.id} (${node.host}:${node.port}) đã kết nối thành công.`);
        });

        lavalinkTester.on('nodeError', (node, error) => {
            console.error(`[LAVALINK-TESTER] ❌ Lỗi từ node ${node.id} (${node.host}:${node.port}):`, error.message);
            if (error.message.includes('403 Forbidden') || error.message.includes('Unauthorized')) {
                console.error(`[LAVALINK-TESTER] ⚠️ Lỗi xác thực (403 Forbidden) cho node ${node.id}. Vui lòng kiểm tra lại mật khẩu (authorization) của node này trong config.js.`);
            } else if (error.message.includes('ECONNREFUSED')) {
                console.error(`[LAVALINK-TESTER] ⚠️ Kết nối bị từ chối cho node ${node.id}. Node có thể đang offline hoặc tường lửa chặn.`);
            } else if (error.message.includes('ETIMEDOUT')) {
                console.error(`[LAVALINK-TESTER] ⚠️ Hết thời gian chờ kết nối cho node ${node.id}. Vấn đề mạng hoặc node quá tải.`);
            } else {
                console.error(`[LAVALINK-TESTER] ⚠️ Lỗi không xác định từ node ${node.id}: ${error.message}`);
            }
        });

        lavalinkTester.on('nodeDisconnect', (node, reason) => {
            // ĐÃ SỬA: Xử lý reason có thể là undefined
            const reasonString = reason ? (typeof reason === 'object' ? JSON.stringify(reason) : reason.toString()) : 'Không rõ';
            console.warn(`[LAVALINK-TESTER] ❌ Node ${node.id} (${node.host}:${node.port}) đã ngắt kết nối. Mã: ${node.stats?.reason?.code || 'N/A'}, Lý do: ${reasonString}`);
        });

        try {
            lavalinkTester.init({ id: client.user.id, username: client.user.username });
            console.log('Lavalink Tester đã được khởi tạo. Đang chờ kết nối nodes...');
        } catch (initError) {
            console.error('Lỗi khi khởi tạo Lavalink Tester:', initError.message);
        }

        await new Promise(resolve => setTimeout(resolve, 10000)); // Đợi 10 giây

        const connectedNodesDP = player.nodes.cache.filter(n => n.connected).size;
        const connectedNodesTester = lavalinkTester.nodes.filter(n => n.connected).size;

        console.log(`--- Báo cáo kết nối Lavalink ---`);
        console.log(`[DISCORD-PLAYER] Số lượng node đang kết nối: ${connectedNodesDP}`);
        console.log(`[LAVALINK-TESTER] Số lượng node đang kết nối: ${connectedNodesTester}`);

        if (connectedNodesDP < 2 && connectedNodesTester < 2) {
            console.warn('Cảnh báo: Ít hơn 2 Lavalink node hoạt động trên cả Discord Player và Lavalink Tester. Có thể ảnh hưởng đến độ ổn định.');
        } else if (connectedNodesDP < 2) {
            console.warn('Cảnh báo: Discord Player có ít hơn 2 Lavalink node hoạt động. Có thể ảnh hưởng đến độ ổn định.');
        }

        console.log('--- Kết thúc báo cáo ---');
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
