// commands/nodes.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nodes')
        .setDescription('Hiển thị trạng thái của các Lavalink node.'),
    async execute(interaction, player) { // Nhận player instance
        await interaction.deferReply();

        let description = 'Trạng thái Lavalink Nodes:\n\n';

        if (player.nodes.length === 0) { // Trong v6.x, player.nodes là một mảng
            description += 'Không có Lavalink node nào được cấu hình.';
        } else {
            description += '**Nodes đã cấu hình:**\n';
            player.nodes.forEach((node, index) => {
                description += `\`${index + 1}.\` **Host:** \`${node.host}:${node.port}\`\n`;
                description += `   **Trạng thái:** ${node.connected ? '✅ Đã kết nối' : '❌ Ngắt kết nối'}\n`;
                if (node.connected) {
                    description += `   **Ping:** \`${node.ping}ms\`\n`;
                    // Stats có thể có cấu trúc khác trong v6.x
                    description += `   **Players:** \`${node.stats?.players || 0}\` đang hoạt động\n`;
                    description += `   **CPU:** \`${(node.stats?.cpu?.systemLoad * 100 || 0).toFixed(2)}%\`\n`;
                    description += `   **RAM:** \`${(node.stats?.memory?.used / 1024 / 1024 || 0).toFixed(2)}MB\`\n`;
                }
                description += '\n';
            });
        }

        description += `\n**Tổng số node đang kết nối:** ${player.nodes.filter(node => node.connected).length}\n`;

        return interaction.editReply({
            embeds: [{
                title: 'Trạng thái Lavalink Nodes',
                description: description,
                color: interaction.client.config.EMBED_COLOR,
                footer: { text: 'Bot sẽ tự động kết nối với Lavalink node khi cần.' }
            }]
        });
    },
};
