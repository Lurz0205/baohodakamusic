// commands/play.js
const { SlashCommandBuilder } = require('discord.js');
const { QueryType } = require('discord-player'); // QueryType vẫn tồn tại trong v6.x

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Phát nhạc từ YouTube hoặc Spotify.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Tên bài hát hoặc liên kết (YouTube, Spotify)')
                .setRequired(true)),
    async execute(interaction, player) {
        const query = interaction.options.getString('query');
        const channel = interaction.member.voice.channel;

        if (!channel) {
            return interaction.reply({ content: 'Bạn phải ở trong một kênh thoại để phát nhạc!', ephemeral: true });
        }

        try {
            await interaction.deferReply();
        } catch (deferError) {
            console.error('Lỗi khi deferReply:', deferError);
            return;
        }

        try {
            const queue = player.createQueue(interaction.guild, {
                metadata: {
                    channel: interaction.channel
                },
                // Các tùy chọn khác cho queue có thể khác trong v6.x
            });

            // Kết nối vào kênh thoại
            try {
                if (!queue.connection) {
                    await queue.connect(channel);
                }
            } catch (error) {
                queue.destroy();
                console.error('Lỗi khi kết nối kênh thoại:', error);
                return interaction.editReply({ content: 'Không thể tham gia kênh thoại của bạn!', ephemeral: true });
            }

            // Tìm kiếm bài hát
            const searchResult = await player.search(query, {
                requestedBy: interaction.user,
                // Trong v6.x, QueryType có thể khác một chút hoặc không có QueryType.Auto
                // Nếu là URL, hãy dùng QueryType.AUTO, nếu không thì YouTubeSearch
                searchEngine: query.startsWith('http') ? QueryType.AUTO : QueryType.YOUTUBE_SEARCH
            });

            if (!searchResult || !searchResult.tracks.length) {
                return interaction.editReply({ content: 'Không tìm thấy kết quả phù hợp. Vui lòng thử lại với từ khóa khác hoặc một liên kết trực tiếp.' });
            }

            // Thêm bài hát vào hàng chờ
            await queue.addTrack(searchResult.tracks[0]);

            if (!queue.playing) {
                await queue.play();
            }

            return interaction.editReply({
                embeds: [{
                    title: `🎶 Đã thêm vào hàng chờ: ${searchResult.tracks[0].title}`,
                    description: `Thời lượng: ${searchResult.tracks[0].duration}\nNguồn: ${searchResult.tracks[0].source}`,
                    url: searchResult.tracks[0].url,
                    thumbnail: { url: searchResult.tracks[0].thumbnail },
                    color: interaction.client.config.EMBED_COLOR,
                    footer: {
                        text: `Yêu cầu bởi: ${searchResult.tracks[0].requestedBy.tag}`,
                        icon_url: searchResult.tracks[0].requestedBy.displayAvatarURL({ dynamic: true })
                    }
                }]
            });

        } catch (e) {
            console.error(e);
            await interaction.editReply({ content: `Đã xảy ra lỗi khi phát nhạc: ${e.message}`, ephemeral: true });
        }
    },
};
