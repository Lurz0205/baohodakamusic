// commands/skip.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Bỏ qua bài hát hiện tại.'),
    async execute(interaction, player) {
        const queue = player.nodes.get(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: 'Không có bài hát nào đang phát!', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const success = queue.node.skip();
            return interaction.followUp({
                content: success ? `⏭️ Đã bỏ qua bài hát hiện tại!` : `❌ Không thể bỏ qua bài hát!`,
            });
        } catch (e) {
            console.error(e);
            return interaction.followUp({ content: `Đã xảy ra lỗi: ${e.message}` });
        }
    },
};
