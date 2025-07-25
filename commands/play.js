// commands/play.js
const { SlashCommandBuilder } = require('discord.js');
const { QueryType } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Phát nhạc từ YouTube hoặc Spotify. Hỗ trợ link SoundCloud.')
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
            let searchResult;
            const isUrl = query.startsWith('http://') || query.startsWith('https://');

            if (isUrl) {
                searchResult = await player.search(query, {
                    requestedBy: interaction.user,
                    searchEngine: QueryType.Auto // Tự động nhận diện nguồn từ link
                });
            } else {
                // Nếu không phải URL (là text query), ưu tiên tìm kiếm trên YouTube
                searchResult = await player.search(query, {
                    requestedBy: interaction.user,
                    searchEngine: QueryType.YouTubeSearch
                });

                // Nếu YouTube không tìm thấy hoặc kết quả không phù hợp, thử Spotify
                if (!searchResult || searchResult.isEmpty()) {
                    searchResult = await player.search(query, {
                        requestedBy: interaction.user,
                        searchEngine: QueryType.SpotifySearch
                    });
                }
            }

            if (!searchResult || searchResult.isEmpty()) {
                return interaction.editReply({ content: 'Không tìm thấy kết quả phù hợp trên YouTube hoặc Spotify. Vui lòng thử lại với từ khóa khác hoặc một liên kết trực tiếp.' });
            }

            const trackToPlay = searchResult.tracks[0];

            // Lớp bảo vệ cuối cùng: Nếu là text search mà kết quả lại là SoundCloud, từ chối phát
            if (!isUrl && trackToPlay.source === 'soundcloud') {
                return interaction.editReply({ content: 'Tìm thấy bài hát từ SoundCloud, nhưng bot chỉ phát SoundCloud qua liên kết trực tiếp khi tìm kiếm bằng tên. Vui lòng cung cấp liên kết SoundCloud nếu bạn muốn phát bài này.' });
            }

            const { track } = await player.play(channel, trackToPlay, {
                requestedBy: interaction.user,
                metadata: { channel: interaction.channel }
            });

            if (track) {
                return interaction.editReply({
                    embeds: [{
                        title: `🎶 Đã thêm vào hàng chờ: ${track.title}`,
                        description: `Thời lượng: ${track.duration}\nNguồn: ${track.source}`,
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
                return interaction.editReply({ content: 'Đã xảy ra lỗi khi thêm bài hát vào hàng chờ.' });
            }
        } catch (e) {
            console.error(e);
            await interaction.editReply({ content: `Đã xảy ra lỗi khi phát nhạc: ${e.message}`, ephemeral: true });
        }
    },
};
