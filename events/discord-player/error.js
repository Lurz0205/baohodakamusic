// events/discord-player/error.js
module.exports = {
    name: 'playerError',
    async execute(queue, error) {
        console.error(`Lỗi từ discord-player trong guild ${queue.guild.name}:`, error);

        // Ghi log chi tiết hơn về lỗi để gỡ lỗi dễ dàng
        if (error.message) console.error('Thông báo lỗi:', error.message);
        if (error.code) console.error('Mã lỗi:', error.code);
        if (error.stack) console.error('Stack trace:', error.stack);
        if (error.name) console.error('Tên lỗi:', error.name);

        // Gửi thông báo lỗi cho người dùng vào kênh mà lệnh được gọi
        if (queue.metadata && queue.metadata.channel) {
            queue.metadata.channel.send(`Đã xảy ra lỗi khi phát nhạc: ${error.message || 'Lỗi không xác định'}. Bot có thể sẽ rời kênh.`).catch(console.error);
        } else {
            console.error('Không tìm thấy kênh để gửi thông báo lỗi playerError. Metadata hoặc channel bị thiếu.');
        }

        // Tự động rời kênh nếu có lỗi nghiêm trọng để tránh kẹt
        if (queue && queue.connection) {
            console.log(`Đang cố gắng rời kênh thoại do lỗi trong guild ${queue.guild.name}.`);
            try {
                queue.delete(); // Xóa hàng chờ và ngắt kết nối
                console.log(`Đã rời kênh thoại thành công trong guild ${queue.guild.name}.`);
            } catch (disconnectError) {
                console.error('Lỗi khi cố gắng rời kênh thoại:', disconnectError);
            }
        }
    },
};
