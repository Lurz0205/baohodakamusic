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

            const guildId = config.GUILD_ID;
            const clientId = config.CLIENT_ID;

            if (!guildId) {
                console.warn('GUILD_ID không được cấu hình. Đang cố gắng đăng ký lệnh GLOBAL. Việc này có thể mất nhiều thời gian để các lệnh xuất hiện.');
                // ĐÃ SỬA: Xóa tất cả lệnh GLOBAL hiện có TRƯỚC KHI đăng ký lại
                await rest.put(Routes.applicationCommands(clientId), { body: [] });
                console.log('Đã xóa tất cả lệnh GLOBAL cũ.');

                const data = await rest.put(
                    Routes.applicationCommands(clientId), // Đăng ký global
                    { body: commands },
                );
                console.log(`Đã tải thành công ${data.length} lệnh Slash Commands GLOBAL.`);
            } else {
                console.log(`Đang đăng ký lệnh cho máy chủ: ${guildId}`);
                // ĐÃ SỬA: Xóa tất cả lệnh GUILD hiện có TRƯỚC KHI đăng ký lại
                await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
                console.log(`Đã xóa tất cả lệnh cũ trong máy chủ ${guildId}.`);

                const data = await rest.put(
                    Routes.applicationGuildCommands(clientId, guildId), // Đăng ký lệnh cho guild cụ thể
                    { body: commands },
                );
                console.log(`Đã tải thành công ${data.length} lệnh Slash Commands cho máy chủ ${guildId}.`);
            }

        } catch (error) {
            console.error('Lỗi khi đăng ký lệnh Slash Commands:', error);
            if (error.code === 50001) {
                console.error('Lỗi "Missing Access": Bot thiếu quyền để quản lý lệnh trong máy chủ hoặc CLIENT_ID/GUILD_ID không chính xác.');
                console.error('Vui lòng kiểm tra lại quyền của bot trong máy chủ Discord (quyền "Manage Commands" hoặc "Administrator") và đảm bảo GUILD_ID trong file config.js (hoặc biến môi trường Render) là chính xác.');
            }
        }
    },
};
