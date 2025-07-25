// config.js
module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN',
    CLIENT_ID: process.env.CLIENT_ID || 'YOUR_CLIENT_ID',
    GUILD_ID: process.env.GUILD_ID || 'YOUR_GUILD_ID',
    EMBED_COLOR: 0x0099ff, // Đã sửa thành định dạng 0x
    
    LAVALINK_NODES: [
        {
            host: 'lava-v3.ajieblogs.eu.org',
            port: 443,
            password: 'https://dsc.gg/ajidevserver', // Mật khẩu là link Discord
            secure: true
        },
        {
            host: 'lavalinkv3-id.serenetia.com',
            port: 443,
            password: 'https://dsc.gg/ajidevserver',
            secure: true
        },
        {
            host: 'lava-v4.ajieblogs.eu.org',
            port: 443,
            password: 'https://dsc.gg/ajidevserver',
            secure: true
        },
        {
            host: 'lavalink.fedotcompot.net',
            port: 443,
            password: 'https://discord.gg/bXXCZzKAyp',
            secure: true
        },
        {
            host: 'lavalinkv4.serenetia.com',
            port: 443,
            password: 'https://dsc.gg/ajidevserver',
            secure: true
        },
        {
            host: 'lava.inzeworld.com',
            port: 3128,
            password: 'saher.inzeworld.com',
            secure: false
        },
        {
            host: '89.251.21.22',
            port: 25691,
            password: 'youshallnotpass',
            secure: false
        },
        {
            host: '79.110.236.32',
            port: 9033,
            password: 'discord.gg/W2GheK3F9m',
            secure: false
        },
        {
            host: 'lava-all.ajieblogs.eu.org',
            port: 80,
            password: 'https://dsc.gg/ajidevserver',
            secure: false
        },
        {
            host: 'lavalink.serenetia.com',
            port: 80,
            password: 'https://dsc.gg/ajidevserver',
            secure: false
        }
    ]
};
