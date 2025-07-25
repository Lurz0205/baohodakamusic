// commands/queue.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Hiển thị hàng chờ phát nhạc.'),
    async execute(interaction, player) {
        const queue = player.nodes.get(interaction.guild.id);

        if (!queue || queue.tracks.size === 0) {
            return interaction.reply({ content: 'Hàng chờ hiện đang trống!', ephemeral: true });
        }

        await interaction.deferReply();

        const currentTrack = queue.currentTrack;
        const tracks = queue.tracks.toArray(); // Chuyển Collection thành Array để duyệt
        const maxDisplay = 10; // Số lượng bài hát hiển thị tối đa
        const embedColor = interaction.client.config.EMBED_COLOR;

        let description = currentTrack
            ? `**Đang phát:** [${currentTrack.title}](${currentTrack.url}) - ${currentTrack.duration}\n\n`
            : '';

        if (tracks.length > 0) {
            description += '**Tiếp theo trong hàng chờ:**\n';
            for (let i = 0; i < Math.min(tracks.length, maxDisplay); i++) {
                const track = tracks[i];
                description += `${i + 1}. [${track.title}](${track.url}) - ${track.duration}\n`;
            }

            if (tracks.length > maxDisplay) {
                description += `\nVà ${tracks.length - maxDisplay} bài hát khác...`;
            }
        } else {
            description += 'Hàng chờ rỗng.';
        }

        return interaction.followUp({
            embeds: [{
                title: 'Danh sách hàng chờ',
                description: description,
                color: embedColor,
                footer: { text: `Tổng số bài hát: ${tracks.length + (currentTrack ? 1 : 0)}` }
            }]
        });
    },
};
