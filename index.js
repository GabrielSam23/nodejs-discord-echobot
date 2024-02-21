const Discord = require('discord.js');
const keep_alive = require('./keep_alive.js')

const client = new Discord.Client();

const FORM_CHANNEL_ID = '1208921193294332034';
const CANAL_ADMITIDOS_ID = '1208917475211612170';
const CANAL_NEGADOS_ID = '1208917509307244554';
const FORM_FIELDS = [
    "Nome",
    "Idade",
    "E-mail",
    "Telefone"
];

// Variáveis globais para armazenar o estado do envio da mensagem de orientação
let orientacao_enviada = false;

client.once('ready', () => {
    console.log('Bot conectado como', client.user.tag);
    console.log('Pronto para receber formulários de admissão.');
    if (!orientacao_enviada) {
        enviarOrientacao();
        orientacao_enviada = true;
    }
});

async function enviarOrientacao() {
    const canal_orientacao_id = '1208915700178100274'; // ID do canal de orientação
    const canal_orientacao = client.channels.cache.get(canal_orientacao_id);
    if (canal_orientacao) {
        const embed_orientacao = new Discord.MessageEmbed()
            .setTitle("Bem-vindo ao servidor!")
            .setDescription("Aqui você encontrará todas as informações necessárias para se juntar à nossa comunidade.")
            .setColor('#00FF00')
            .setThumbnail('https://example.com/seu_logo.png')
            .addField("Como se candidatar?", "Para se candidatar, utilize o comando `!enviarformulario` e preencha o formulário que será enviado em seguida.")
            .addField("Dúvidas?", "Se tiver alguma dúvida, não hesite em entrar em contato com a equipe de moderação.")
            .setFooter("Obrigado por escolher nosso servidor!");
        try {
            await canal_orientacao.send(embed_orientacao);
        } catch (e) {
            console.error("Erro ao enviar a mensagem de orientação:", e);
        }
    } else {
        console.error("Canal de orientação não encontrado.");
    }
}

client.on('message', async message => {
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'enviarformulario') {
        if (message.author.bot) return; // Evita que o bot responda ao próprio comando
        const embed = new Discord.MessageEmbed()
            .setTitle("Formulário de Admissão")
            .setDescription("Por favor, preencha o formulário abaixo com as informações solicitadas:")
            .setColor('#0000FF');
        for (const field of FORM_FIELDS) {
            embed.addField(field, "Digite sua resposta aqui", false);
        }
        const sentMessage = await message.channel.send(embed);

        const respostas = {};

        for (const field of FORM_FIELDS) {
            await message.channel.send(`Por favor, digite sua resposta para ${field}:`);
            const filter = m => m.author.id === message.author.id && m.channel.id === message.channel.id;
            const response = await message.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] });
            respostas[field] = response.first().content;
            embed.fields.splice(FORM_FIELDS.indexOf(field), 1, { name: field, value: response.first().content });
            await sentMessage.edit(embed);
        }

        let responseMessage = `Respostas do formulário de ${message.author}:\n`;
        for (const [field, answer] of Object.entries(respostas)) {
            responseMessage += `${field}: ${answer}\n`;
        }

        const channel = client.channels.cache.get(FORM_CHANNEL_ID);
        if (channel) {
            const formMessage = await channel.send(responseMessage);
            await formMessage.react('✅');
            await formMessage.react('❌');
            await message.channel.send("Seu formulário foi enviado com sucesso. Aguarde uma resposta.");
        } else {
            await message.channel.send('Não foi possível enviar o formulário no momento. Por favor, tente novamente mais tarde.');
        }
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;

    if (reaction.message.channel.id === FORM_CHANNEL_ID) {
        const formMessage = await reaction.message.fetch();
        const { description } = formMessage.embeds[0];
        const regex = /Respostas do formulário de <@(\d+)>:/; // Expressão regular para extrair o ID do autor
        const match = description.match(regex);
        if (match) {
            const authorID = match[1];
            const author = await client.users.fetch(authorID);
            if (reaction.emoji.name === '✅') {
                aceitarAdmissao(reaction, author);
            } else if (reaction.emoji.name === '❌') {
                recusarAdmissao(reaction, author);
            }
        }
    }
});


async function aceitarAdmissao(reaction, author) {
    const canal_admitidos = client.channels.cache.get(CANAL_ADMITIDOS_ID);
    if (canal_admitidos) {
        try {
            await reaction.message.delete();
            const mensagem_admitido = `Parabéns! A admissão de ${author} foi aceita. Bem-vindo à nossa comunidade!`;
            await canal_admitidos.send(mensagem_admitido);
            await author.send("Parabéns! Sua admissão foi aceita. Bem-vindo à nossa comunidade!");
        } catch (e) {
            console.error("Erro ao aceitar admissão:", e);
        }
    } else {
        console.error("Canal de admissões aceitas não encontrado.");
    }
}

async function recusarAdmissao(reaction, author) {
    const canal_negados = client.channels.cache.get(CANAL_NEGADOS_ID);
    if (canal_negados) {
        try {
            await reaction.message.delete();
            const mensagem_negado = `A admissão de ${author} foi recusada. Entre em contato conosco para mais informações.`;
            await canal_negados.send(mensagem_negado);
            await author.send("Sua admissão foi recusada. Entre em contato conosco para mais informações.");
        } catch (e) {
            console.error("Erro ao recusar admissão:", e);
        }
    } else {
        console.error("Canal de admissões negadas não encontrado.");
    }
}

client.login(process.env.TOKEN);
