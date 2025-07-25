// commands/stop.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Dừng phát nhạc và xóa hàng chờ.'),
    async execute(interaction, player) {
        const queue = player.nodes.get(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: 'Không có bài hát nào đang phát!', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            queue.delete(); // Xóa hàng chờ và ngắt kết nối
            return interaction.followUp({ content: '⏹️ Đã dừng phát nhạc và rời kênh thoại!' });
        } catch (e) {
            console.error(e);
            return interaction.followUp({ content: `Đã xảy ra lỗi: ${e.message}` });
        }
    },
};
