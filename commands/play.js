// commands/play.js
const { SlashCommandBuilder } = require('discord.js');
const { QueryType } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Phát nhạc từ YouTube, Spotify, hoặc SoundCloud (qua link).')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Tên bài hát hoặc liên kết (YouTube, Spotify, SoundCloud)')
                .setRequired(true)),
    async execute(interaction, player) {
        const query = interaction.options.getString('query');
        const channel = interaction.member.voice.channel;

        if (!channel) {
            return interaction.reply({ content: 'Bạn phải ở trong một kênh thoại để phát nhạc!', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const { track } = await player.play(channel, query, {
                requestedBy: interaction.user,
                // ĐÃ SỬA: Ưu tiên tìm kiếm trên YouTube, sau đó là Spotify.
                // Nếu là link trực tiếp (YouTube, Spotify, SoundCloud), discord-player vẫn sẽ tự động nhận diện.
                searchEngine: [QueryType.YouTube, QueryType.SpotifySearch],
                metadata: { channel: interaction.channel }
            });

            if (track) {
                return interaction.followUp({
                    embeds: [{
                        title: `🎶 Đã thêm vào hàng chờ: ${track.title}`,
                        description: `Thời lượng: ${track.duration}`,
                        url: track.url,
                        thumbnail: { url: track.thumbnail },
                        color: interaction.client.config.EMBED_COLOR,
                        footer: {
                            text: `Yêu cầu bởi: ${track.requestedBy.tag}`,
                            icon_url: track.requestedBy.displayAvatarURL({ dynamic: true })
                        }
                    }]
                });
            } else {
                return interaction.followUp({ content: 'Không tìm thấy kết quả phù hợp!' });
            }
        } catch (e) {
            console.error(e);
            return interaction.followUp({ content: `Đã xảy ra lỗi: ${e.message}` });
        }
    },
};
