// events/discord-player/trackStart.js
module.exports = {
    name: 'playerStart', // Tên sự kiện trong discord-player (trước đây là trackStart)
    async execute(queue, track) {
        // Gửi thông báo bài hát đang phát ra kênh văn bản nơi lệnh được gọi
        queue.metadata.channel.send({
            embeds: [{
                title: `▶️ Bắt đầu phát: ${track.title}`,
                description: `Thời lượng: ${track.duration}\nKênh: ${track.author}`,
                url: track.url,
                thumbnail: { url: track.thumbnail },
                color: queue.client.config.EMBED_COLOR,
                footer: {
                    text: `Yêu cầu bởi: ${track.requestedBy.tag}`,
                    icon_url: track.requestedBy.displayAvatarURL({ dynamic: true })
                }
            }]
        }).catch(console.error);
    },
};
