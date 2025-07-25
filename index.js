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
        // ĐÃ SỬA: Truyền nodes TRỰC TIẾP vào constructor.
        // Đây là cách duy nhất và đúng đắn trong discord-player v7.
        nodes: config.LAVALINK_NODES,
    });

    // ĐÃ SỬA: Đặt listener debug ngay sau khi player được khởi tạo
    player.events.on('debug', (queue, message) => {
        console.log(`[DEBUG] ${message}`);
    });

    // Logging để kiểm tra xem Lavalink nodes có được đọc từ config không
    console.log(`Đang cấu hình ${config.LAVALINK_NODES.length} Lavalink nodes.`);
    // THÊM: Log trực tiếp đối tượng player.nodes để kiểm tra nội dung
    console.log('Trạng thái player.nodes ngay sau khởi tạo:', player.nodes);
    // Sau khi truyền vào constructor, player.nodes.cache sẽ tự động chứa các node
    // nhưng chúng sẽ không được kết nối cho đến khi có yêu cầu phát nhạc đầu tiên.
    console.log('Số lượng node trong player.nodes.cache (sau khởi tạo):', player.nodes.cache.size);

    // ĐÃ XÓA: Loại bỏ vòng lặp player.nodes.create() vì nó gây ra lỗi NoGuildError
    // if (config.LAVALINK_NODES && config.LAVALINK_NODES.length > 0) {
    //     console.log(`Đang cố gắng tạo ${config.LAVALINK_NODES.length} Lavalink nodes.`);
    //     config.LAVALINK_NODES.forEach(nodeConfig => {
    //         try {
    //             const node = player.nodes.create(nodeConfig);
    //             console.log(`Đã tạo node: ${node.id} (${node.host}:${node.port})`);
    //         } catch (createError) {
    //             console.error(`Lỗi khi tạo Lavalink node ${nodeConfig.host}:${nodeConfig.port}:`, createError);
    //         }
    //     });
    // } else {
    //     console.warn('Không có Lavalink node nào được cấu hình trong config.js.');
    // }
    // console.log('Số lượng node trong player.nodes.cache (sau khi tạo):', player.nodes.cache.size);


    // Đảm bảo extractors được tải đúng cách
    try {
        await player.extractors.loadMulti(DefaultExtractors);
        // Nếu bạn muốn loại bỏ SoundCloud, bạn có thể bỏ comment dòng này:
        // player.extractors.unregister('SoundCloudExtractor');
        // console.log('Đã gỡ đăng ký SoundCloudExtractor.');
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

    // THÊM CÁC SỰ KIỆN LỖI LAVALINK NÀY
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
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: 'Có lỗi xảy ra khi thực hiện lệnh này!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Có lỗi xảy ra khi thực hiện lệnh này!', ephemeral: true });
            }
        }
    });

    client.login(config.BOT_TOKEN);

    // Kiểm tra và kết nối Lavalink nodes sau khi bot đã sẵn sàng
    client.once('ready', () => {
        console.log('Client đã sẵn sàng. Đang kiểm tra Lavalink nodes...');
        if (player.nodes.cache.size === 0) {
            console.warn('Không có Lavalink node nào trong cache của player. Vui lòng kiểm tra cấu hình hoặc trạng thái của các node.');
        } else {
            console.log(`Tìm thấy ${player.nodes.cache.size} Lavalink nodes trong cache. Kiểm tra log để xem trạng thái kết nối.`);
            player.nodes.cache.forEach(node => {
                console.log(`Node ${node.id}: Kết nối: ${node.connected ? '✅' : '❌'}`);
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
