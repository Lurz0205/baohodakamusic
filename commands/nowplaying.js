// commands/nowplaying.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Hiển thị thông tin bài hát đang phát.'),
    async execute(interaction, player) {
        const queue = player.nodes.get(interaction.guild.id);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: 'Không có bài hát nào đang phát!', ephemeral: true });
        }

        await interaction.deferReply();

        const track = queue.currentTrack;
        const progressBar = queue.node.createProgressBar({
            timecodes: true,
            length: 15,
        });
        const embedColor = interaction.client.config.EMBED_COLOR;

        return interaction.followUp({
            embeds: [{
                title: `🎵 Đang phát: ${track.title}`,
                url: track.url,
                thumbnail: { url: track.thumbnail },
                description: `Tác giả: ${track.author}\nThời lượng: ${track.duration}\n\n${progressBar}`,
                color: embedColor,
                footer: {
                    text: `Yêu cầu bởi: ${track.requestedBy.tag}`,
                    icon_url: track.requestedBy.displayAvatarURL({ dynamic: true })
                }
            }]
        });
    },
};
