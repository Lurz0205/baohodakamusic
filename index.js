// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { Player } = require('discord-player');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent // Cần cho các lệnh không phải slash commands, hoặc nếu bạn muốn đọc tin nhắn
    ]
});

client.commands = new Collection();
client.config = config;

// Khởi tạo Discord Player
const player = new Player(client, {
    ytdlOptions: {
        filter: 'audioonly',
        quality: 'highestaudio',
        highWaterMark: 1 << 25, // Tăng buffer để tránh giật lag
    }
});

// Đăng ký extractors (YouTube, Spotify, SoundCloud)
// Sử dụng player.extractors.loadDefault() để tải tất cả các extractors mặc định
player.extractors.loadDefault();

// Cấu hình các Lavalink node
player.nodes.set(config.LAVALINK_NODES);

// Xử lý các sự kiện của Discord Player
fs.readdirSync(path.join(__dirname, 'events', 'discord-player')).forEach(file => {
    const event = require(path.join(__dirname, 'events', 'discord-player', file));
    if (event.name) {
        player.events.on(event.name, (...args) => event.execute(...args));
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
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'Có lỗi xảy ra khi thực hiện lệnh này!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'Có lỗi xảy ra khi thực hiện lệnh này!', ephemeral: true });
        }
    }
});

client.login(config.BOT_TOKEN);
