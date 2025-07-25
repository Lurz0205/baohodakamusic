// config.js
module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN',
    CLIENT_ID: process.env.CLIENT_ID || 'YOUR_CLIENT_ID',
    GUILD_ID: process.env.GUILD_ID || 'YOUR_GUILD_ID',
    EMBED_COLOR: '#0099ff', // Màu mặc định cho embeds

    LAVALINK_NODES: [
        {
            id: 'node-1', // ID duy nhất cho node
            host: 'lava-v3.ajieblogs.eu.org',
            port: 443,
            authorization: 'youshallnotpass', // Thay bằng mật khẩu của node nếu có
            secure: true // Đặt true nếu là SSL (port 443)
        },
        {
            id: 'node-2',
            host: 'lavalinkv3-id.serenetia.com',
            port: 443,
            authorization: 'youshallnotpass',
            secure: true
        },
        {
            id: 'node-3',
            host: 'lava-v4.ajieblogs.eu.org',
            port: 443,
            authorization: 'youshallnotpass',
            secure: true
        },
        {
            id: 'node-4',
            host: 'lavalink.fedotcompot.net',
            port: 443,
            authorization: 'youshallnotpass',
            secure: true
        },
        {
            id: 'node-5',
            host: 'lavalinkv4.serenetia.com',
            port: 443,
            authorization: 'youshallnotpass',
            secure: true
        },
        {
            id: 'node-6',
            host: 'lava.inzeworld.com',
            port: 3128,
            authorization: 'youshallnotpass',
            secure: false // Đặt false nếu không phải SSL
        },
        {
            id: 'node-7',
            host: '89.251.21.22',
            port: 25691,
            authorization: 'youshallnotpass',
            secure: false
        },
        {
            id: 'node-8',
            host: '79.110.236.32',
            port: 9033,
            authorization: 'youshallnotpass',
            secure: false
        },
        {
            id: 'node-9',
            host: 'lava-all.ajieblogs.eu.org',
            port: 80,
            authorization: 'youshallnotpass',
            secure: false
        },
        {
            id: 'node-10',
            host: 'lavalink.serenetia.com',
            port: 80,
            authorization: 'youshallnotpass',
            secure: false
        }
    ]
};
