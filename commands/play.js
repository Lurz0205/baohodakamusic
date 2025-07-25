// commands/play.js
const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice'); // Cần cho kết nối thoại

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Phát nhạc từ YouTube hoặc Spotify.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Tên bài hát hoặc liên kết (YouTube, Spotify)')
                .setRequired(true)),
    async execute(interaction, lavalink, client) { // Nhận lavalink instance
        const query = interaction.options.getString('query');
        const channel = interaction.member.voice.channel;

        if (!channel) {
            return interaction.reply({ content: 'Bạn phải ở trong một kênh thoại để phát nhạc!', ephemeral: true });
        }

        if (!channel.joinable) {
            return interaction.reply({ content: 'Tôi không có quyền tham gia kênh thoại này!', ephemeral: true });
        }

        if (!channel.speakable) {
            return interaction.reply({ content: 'Tôi không có quyền nói trong kênh thoại này!', ephemeral: true });
        }

        // Kiểm tra xem có Lavalink node nào đang kết nối không
        const connectedNode = lavalink.nodes.find(node => node.connected);
        if (!connectedNode) {
            return interaction.reply({ content: 'Bot không thể kết nối với Lavalink node nào. Vui lòng thử lại sau hoặc liên hệ quản trị viên.', ephemeral: true });
        }

        try {
            await interaction.deferReply();
        } catch (deferError) {
            console.error('Lỗi khi deferReply:', deferError);
            return;
        }

        try {
            // Tìm kiếm bài hát
            const searchResult = await connectedNode.rest.loadTracks(query);

            if (!searchResult || searchResult.loadType === 'NO_MATCHES' || searchResult.loadType === 'LOAD_FAILED') {
                return interaction.editReply({ content: 'Không tìm thấy kết quả phù hợp. Vui lòng thử lại với từ khóa khác hoặc một liên kết trực tiếp.' });
            }

            let track;
            if (searchResult.loadType === 'PLAYLIST_LOADED') {
                track = searchResult.tracks[0]; // Lấy bài đầu tiên của playlist
                // Bạn có thể thêm logic để thêm toàn bộ playlist vào hàng chờ nếu muốn
            } else {
                track = searchResult.tracks[0];
            }

            // Kiểm tra nguồn của track để đảm bảo không phải SoundCloud
            // Lavalink-client tự động xử lý nguồn, nhưng nếu bạn muốn cấm cụ thể, bạn có thể kiểm tra ở đây.
            // Ví dụ: if (track.info.uri.includes('soundcloud.com')) { ... }

            let player = lavalink.players.get(interaction.guild.id);

            // Nếu chưa có player cho guild này, tạo mới
            if (!player) {
                const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                });

                // Chờ kết nối thoại sẵn sàng
                await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

                player = lavalink.createPlayer({
                    guildId: interaction.guild.id,
                    voiceChannelId: channel.id,
                    textChannelId: interaction.channel.id, // Lưu text channel ID để gửi thông báo
                    connection: connection,
                    node: connectedNode, // Gán node đã kết nối
                });
            }

            // Thêm bài hát vào hàng chờ và phát
            await player.queue.add(track);
            if (!player.playing && !player.paused) {
                await player.queue.start();
            }

            return interaction.editReply({
                embeds: [{
                    title: `🎶 Đã thêm vào hàng chờ: ${track.info.title}`,
                    description: `Thời lượng: ${formatDuration(track.info.length)}\nNguồn: ${track.info.uri.includes('youtube.com') ? 'YouTube' : track.info.uri.includes('spotify.com') ? 'Spotify' : 'Khác'}`,
                    url: track.info.uri,
                    thumbnail: { url: track.info.thumbnail || 'https://placehold.co/128x128/000000/FFFFFF?text=No+Image' },
                    color: client.config.EMBED_COLOR,
                    footer: {
                        text: `Yêu cầu bởi: ${interaction.user.tag}`,
                        icon_url: interaction.user.displayAvatarURL({ dynamic: true })
                    }
                }]
            });

        } catch (e) {
            console.error(e);
            await interaction.editReply({ content: `Đã xảy ra lỗi khi phát nhạc: ${e.message}`, ephemeral: true });
        }
    },
};

// Hàm hỗ trợ định dạng thời lượng
function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}
