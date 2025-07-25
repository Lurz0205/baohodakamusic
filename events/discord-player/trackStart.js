// events/discord-player/trackStart.js
module.exports = {
    name: 'playerStart',
    async execute(queue, track) {
        // Kiểm tra xem metadata và channel có tồn tại không trước khi gửi tin nhắn
        if (queue.metadata && queue.metadata.channel) {
            queue.metadata.channel.send({
                embeds: [{
                    title: `▶️ Bắt đầu phát: ${track.title}`,
                    description: `Thời lượng: ${track.duration}\nKênh: ${track.author}\nNguồn: ${track.source}`,
                    url: track.url,
                    thumbnail: { url: track.thumbnail },
                    color: queue.client.config.EMBED_COLOR,
                    footer: {
                        text: `Yêu cầu bởi: ${track.requestedBy.tag}`,
                        icon_url: track.requestedBy.displayAvatarURL({ dynamic: true })
                    }
                }]
            }).catch(console.error);
        } else {
            console.warn('Không tìm thấy kênh để gửi thông báo trackStart. Metadata hoặc channel bị thiếu.');
        }
    },
};
