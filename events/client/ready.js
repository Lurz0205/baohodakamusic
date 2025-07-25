// events/client/ready.js
const { REST, Routes } = require('discord.js');
const config = require('../../config');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`✅ Bot đã sẵn sàng! Đăng nhập với tên: ${client.user.tag}`);

        // Đăng ký Slash Commands
        const commands = Array.from(client.commands.values()).map(cmd => cmd.data.toJSON());

        const rest = new REST({ version: '10' }).setToken(config.BOT_TOKEN);

        try {
            console.log(`Đang tải ${commands.length} lệnh Slash Commands.`);

            // Đăng ký lệnh cho guild cụ thể (trong môi trường phát triển)
            // Hoặc Routes.applicationCommands(config.CLIENT_ID) để đăng ký global (khi deploy)
            const data = await rest.put(
                Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), // Dùng GUILD_ID trong dev
                // Routes.applicationCommands(config.CLIENT_ID), // Dùng cái này khi deploy lên production
                { body: commands },
            );

            console.log(`Đã tải thành công ${data.length} lệnh Slash Commands.`);
        } catch (error) {
            console.error('Lỗi khi đăng ký lệnh Slash Commands:', error);
        }
    },
};
