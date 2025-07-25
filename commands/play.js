// commands/play.js
const { SlashCommandBuilder } = require('discord.js');
const { QueryType } = require('discord-player');

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

        // ĐÃ SỬA: Kiểm tra xem có Lavalink node nào đang kết nối không
        const connectedNodes = player.nodes.manager.nodes.filter(node => node.connected);
        if (connectedNodes.size === 0) {
            return interaction.reply({ content: 'Bot không thể kết nối với Lavalink node nào. Vui lòng thử lại sau hoặc liên hệ quản trị viên.', ephemeral: true });
        }

        try {
            await interaction.deferReply();
        } catch (deferError) {
            console.error('Lỗi khi deferReply:', deferError);
            return;
        }

        try {
            let searchResult;
            const isUrl = query.startsWith('http://') || query.startsWith('https://');

            if (isUrl) {
                searchResult = await player.search(query, {
                    requestedBy: interaction.user,
                    searchEngine: QueryType.Auto // Sẽ chỉ tìm YouTube/Spotify vì các extractor khác đã bị gỡ
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

            // ĐÃ THÊM: Kiểm tra nguồn của track để đảm bảo không phải SoundCloud
            if (trackToPlay.source === 'soundcloud') {
                return interaction.editReply({ content: 'Đã tìm thấy bài hát từ SoundCloud, nhưng bot chỉ hỗ trợ YouTube và Spotify. Vui lòng cung cấp liên kết YouTube hoặc Spotify.' });
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
