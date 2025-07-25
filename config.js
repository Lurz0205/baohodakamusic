// config.js
module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    GUILD_ID: process.env.GUILD_ID,
    LAVALINK_NODES: [
        {
            identifier: "AjieDev-V3",
            password: "https://dsc.gg/ajidevserver",
            host: "lava-v3.ajieblogs.eu.org",
            port: 443,
            secure: true
        },
        {
            identifier: "Serenetia-V3",
            password: "https://dsc.gg/ajidevserver",
            host: "lavalinkv3-id.serenetia.com",
            port: 443,
            secure: true
        },
        {
            identifier: "AjieDev-V4",
            password: "https://dsc.gg/ajidevserver",
            host: "lava-v4.ajieblogs.eu.org",
            port: 443,
            secure: true
        },
        {
            identifier: "Fedot_Compot-main",
            password: "https://discord.gg/bXXCZzKAyp",
            host: "lavalink.fedotcompot.net",
            port: 443,
            secure: true
        },
        {
            identifier: "Serenetia-V4",
            password: "https://dsc.gg/ajidevserver",
            host: "lavalinkv4.serenetia.com",
            port: 443,
            secure: true
        },
        {
            identifier: "INZEWORLD.COM (DE)",
            password: "saher.inzeworld.com",
            host: "lava.inzeworld.com",
            port: 3128,
            secure: false
        },
        {
            identifier: "RY4N",
            password: "youshallnotpass",
            host: "89.251.21.22",
            port: 25691,
            secure: false
        },
        {
            identifier: "RY4N X ARINO",
            password: "discord.gg/W2GheK3F9m",
            host: "79.110.236.32",
            port: 9033,
            secure: false
        },
        {
            identifier: "AjieDev-LDP-NonSSL",
            password: "https://dsc.gg/ajidevserver",
            host: "lava-all.ajieblogs.eu.org",
            port: 80,
            secure: false
        },
        {
            identifier: "Serenetia-LDP-NonSSL",
            password: "https://dsc.gg/ajidevserver",
            host: "lavalink.serenetia.com",
            port: 80,
            secure: false
        }
    ],
    // Các tùy chọn khác
    DEFAULT_VOLUME: 80,
    MAX_QUEUE_SIZE: 200,
    EMBED_COLOR: 0x0099ff, // Đã sửa: Chuyển từ chuỗi hex sang số nguyên
};
