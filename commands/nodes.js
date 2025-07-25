// commands/nodes.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nodes')
        .setDescription('Hiển thị trạng thái của các Lavalink node đang kết nối.'), // Cập nhật mô tả
    async execute(interaction, player) {
        await interaction.deferReply();

        // Lấy các node đang kết nối từ cache
        // player.nodes là GuildNodeManager, nó có thuộc tính .cache
        const connectedNodes = player.nodes.cache;
        if (!connectedNodes || connectedNodes.size === 0) {
            return interaction.editReply({ content: 'Không có Lavalink node nào đang kết nối. Vui lòng thử lại lệnh `/play` để kích hoạt kết nối.' });
        }

        let description = 'Trạng thái Lavalink Nodes đang kết nối:\n';
        connectedNodes.forEach(node => { // Lặp qua các node trong cache
            description += `\n**ID:** \`${node.id}\`\n`;
            description += `**Host:** \`${node.host}:${node.port}\`\n`; // Lấy host và port trực tiếp từ node
            description += `**Trạng thái:** ${node.connected ? '✅ Đã kết nối' : '❌ Ngắt kết nối'}\n`;
            if (node.connected) {
                description += `**Ping:** \`${node.ping}ms\`\n`;
                description += `**Players:** \`${node.stats?.players || 0}\` đang hoạt động\n`; // Thêm kiểm tra null cho stats
                description += `**CPU:** \`${(node.stats?.cpu?.systemLoad * 100 || 0).toFixed(2)}%\`\n`; // Thêm kiểm tra null
                description += `**RAM:** \`${(node.stats?.memory?.used / 1024 / 1024 || 0).toFixed(2)}MB\`\n`; // Thêm kiểm tra null
            }
        });

        return interaction.editReply({
            embeds: [{
                title: 'Trạng thái Lavalink Nodes',
                description: description,
                color: interaction.client.config.EMBED_COLOR,
                footer: { text: `Tổng số node đang kết nối: ${connectedNodes.size}` }
            }]
        });
    },
};
