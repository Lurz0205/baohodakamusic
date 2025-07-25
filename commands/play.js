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

        let searchEngineType = QueryType.Auto;

        // Kiểm tra nếu truy vấn không phải là một URL, thì ưu tiên tìm kiếm trên YouTube
        // Regex đơn giản để kiểm tra URL. Có thể cần regex phức tạp hơn cho các trường hợp edge.
        const urlRegex = /^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|[a-zA-Z0-9]+\.[^\s]{2,})$/i;
        if (!urlRegex.test(query)) {
            // Nếu không phải URL, ưu tiên tìm kiếm trên YouTube
            searchEngineType = QueryType.YouTubeSearch;
            // Để tìm kiếm Spotify bằng tên, bạn sẽ cần một lệnh riêng hoặc logic phức tạp hơn
            // vì QueryType.SpotifySearch chỉ hoạt động tốt với các truy vấn cụ thể.
            // Để đơn giản, chúng ta sẽ tập trung vào YouTube cho tìm kiếm bằng tên.
        }

        try {
            const { track } = await player.play(channel, query, {
                requestedBy: interaction.user,
                searchEngine: searchEngineType, // Sử dụng searchEngine đã xác định
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
                return interaction.followUp({ content: 'Không tìm thấy kết quả phù hợp trên YouTube. Vui lòng thử lại với từ khóa khác hoặc một liên kết trực tiếp.' });
            }
        } catch (e) {
            console.error(e);
            return interaction.followUp({ content: `Đã xảy ra lỗi khi phát nhạc: ${e.message}` });
        }
    },
};
