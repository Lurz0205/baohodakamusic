// commands/play.js
const { SlashCommandBuilder, InteractionResponseTypes } = require('discord.js'); // Thêm InteractionResponseTypes
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
            // Phản hồi ngay lập tức nếu không ở kênh thoại
            return interaction.reply({ content: 'Bạn phải ở trong một kênh thoại để phát nhạc!', ephemeral: true });
        }

        // Defer ngay lập tức để tránh lỗi Unknown interaction do thời gian xử lý
        // Sử dụng interaction.deferReply() để gửi một phản hồi tạm thời.
        // Sau đó, chúng ta sẽ dùng interaction.editReply() để cập nhật tin nhắn.
        // Bắt lỗi khi deferReply() thất bại (ví dụ: tương tác đã quá hạn)
        try {
            await interaction.deferReply();
        } catch (deferError) {
            console.error('Lỗi khi deferReply:', deferError);
            // Nếu deferReply thất bại (thường là do Unknown interaction),
            // chúng ta không thể làm gì thêm với tương tác này.
            // Có thể log lỗi và thoát.
            return; // Thoát khỏi hàm để tránh lỗi tiếp theo
        }

        try {
            let searchResult;
            const isUrl = query.startsWith('http://') || query.startsWith('https://');

            if (isUrl) {
                searchResult = await player.search(query, {
                    requestedBy: interaction.user,
                    searchEngine: QueryType.Auto
                });
            } else {
                searchResult = await player.search(query, {
                    requestedBy: interaction.user,
                    searchEngine: QueryType.YouTubeSearch
                });

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
            // Sử dụng editReply thay vì followUp/reply sau khi đã defer
            await interaction.editReply({ content: `Đã xảy ra lỗi khi phát nhạc: ${e.message}`, ephemeral: true });
        }
    },
};
