// events/discord-player/error.js
module.exports = {
    name: 'playerError', // Tên sự kiện trong discord-player (trước đây là error)
    async execute(queue, error) {
        console.error(`Lỗi từ discord-player trong guild ${queue.guild.name}:`, error);

        // Gửi thông báo lỗi cho người dùng
        if (queue.metadata && queue.metadata.channel) {
            queue.metadata.channel.send(`Đã xảy ra lỗi khi phát nhạc: ${error.message}`).catch(console.error);
        }
    },
};
