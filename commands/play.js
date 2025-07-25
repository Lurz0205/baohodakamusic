// commands/play.js
const { SlashCommandBuilder } = require('discord.js');
const { QueryType } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Phát nhạc từ YouTube hoặc Spotify.') // Cập nhật mô tả để phản ánh ưu tiên tìm kiếm
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
                // ĐÃ SỬA: Sử dụng QueryType.Auto và fallbackSearchEngine để ưu tiên tìm kiếm
                searchEngine: QueryType.Auto,
                fallbackSearchEngine: QueryType.YouTube, // Ưu tiên YouTube nếu QueryType.Auto không tìm thấy
                // Nếu vẫn không tìm thấy từ YouTube, bạn có thể thử Spotify bằng cách thêm logic
                // hoặc dựa vào cách DefaultExtractors xử lý.
                // Để đảm bảo Spotify được ưu tiên sau YouTube khi tìm kiếm bằng tên,
                // chúng ta sẽ cần một cách tiếp cận phức tạp hơn hoặc dựa vào DefaultExtractors
                // đã được tải để xử lý Spotify link.
                // Với QueryType.Auto, nó sẽ tự động nhận diện link.
                // Nếu là tìm kiếm bằng text, nó sẽ ưu tiên YouTube do fallback.
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
