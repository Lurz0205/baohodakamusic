// config.js
module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID, // ID ứng dụng của bot
    GUILD_ID: process.env.GUILD_ID,   // ID máy chủ để đăng ký lệnh slash (chỉ trong dev, khi deploy thì bỏ hoặc đăng ký global)
    LAVALINK_NODES: [
        {
            host: 'lava1.example.com', // Thay bằng host Lavalink của bạn
            port: 2333,
            password: 'youshallnotpass', // Thay bằng password Lavalink của bạn
            secure: false // true nếu có SSL, false nếu không
        },
        {
            host: 'lava2.example.com', // Thay bằng host Lavalink khác (nếu có)
            port: 443,
            password: 'youshallnotpass',
            secure: true
        }
    ],
    // Các tùy chọn khác
    DEFAULT_VOLUME: 80,
    MAX_QUEUE_SIZE: 200,
    EMBED_COLOR: '#0099ff', // Màu cho các tin nhắn embed
};
