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

        // Defer ngay lập tức để tránh lỗi Unknown interaction
        await interaction.deferReply();

        try {
            let searchResult;
            // Kiểm tra xem truy vấn có phải là URL hợp lệ mà discord-player có thể xử lý không
            // QueryType.Auto sẽ tự động nhận diện các URL từ YouTube, Spotify, SoundCloud, v.v.
            // Nếu không phải URL, chúng ta sẽ ép buộc tìm kiếm trên YouTube.
            if (query.startsWith('http://') || query.startsWith('https://')) {
                searchResult = await player.search(query, {
                    requestedBy: interaction.user,
                    searchEngine: QueryType.Auto // Để xử lý các link
                });
            } else {
                // Nếu không phải URL, ưu tiên tìm kiếm trên YouTube
                searchResult = await player.search(query, {
                    requestedBy: interaction.user,
                    searchEngine: QueryType.YouTubeSearch // Ép buộc tìm kiếm YouTube
                });

                // Nếu YouTube không tìm thấy hoặc kết quả không phù hợp, thử Spotify
                if (!searchResult || searchResult.isEmpty()) {
                    searchResult = await player.search(query, {
                        requestedBy: interaction.user,
                        searchEngine: QueryType.SpotifySearch // Thử Spotify nếu YouTube không có
                    });
                }
            }


            if (!searchResult || searchResult.isEmpty()) {
                return interaction.followUp({ content: 'Không tìm thấy kết quả phù hợp trên YouTube hoặc Spotify. Vui lòng thử lại với từ khóa khác hoặc một liên kết trực tiếp.' });
            }

            const { track } = await player.play(channel, searchResult.tracks[0], {
                requestedBy: interaction.user,
                metadata: { channel: interaction.channel } // Đảm bảo kênh được truyền
            });

            if (track) {
                return interaction.followUp({
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
                return interaction.followUp({ content: 'Đã xảy ra lỗi khi thêm bài hát vào hàng chờ.' });
            }
        } catch (e) {
            console.error(e);
            // Đảm bảo chỉ gửi followUp nếu chưa được phản hồi
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: `Đã xảy ra lỗi khi phát nhạc: ${e.message}`, ephemeral: true });
            } else {
                await interaction.reply({ content: `Đã xảy ra lỗi khi phát nhạc: ${e.message}`, ephemeral: true });
            }
        }
    },
};
