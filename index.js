const token = '2038030257:AAFz2Rlf9p5PjDFV8DtVJSLCiuHgyC3CVG8';
const https = require('https'); // or 'https' for https:// URLs
const fs = require('fs');
const sqlite = require('sqlite')
const sqlite3 = require('sqlite3')
const qrcode = require('qrcode-reader')
const qr = require('qr-image')
const Jimp = require('jimp')
const { Telegraf } = require('telegraf')
const bot = new Telegraf(token)
const db = sqlite.open({filename: "data.db", mode: sqlite3.OPEN_READWRITE, driver: sqlite3.Database})
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const help_msg = `
/encode - command to create QR code.
You can send me a photo 
`

const createTable = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER NOT NULL,
    first_name TEXT,
    state INTEGER NOT NULL
)
`

const saveUser = `
INSERT INTO users (id, first_name, state) VALUES (?, ?, ?)
`

const getUserById = `
SELECT * FROM users WHERE id = ?
`

const updateState = `
UPDATE users SET state = ? WHERE id = ?
`

const getUserState = `
SELECT state FROM users WHERE id = ?
`

function start_msg(msg)
{
    var u_data = {'id': msg.from.id, 'f_name': msg.from.first_name, 'state': 0}
    var text = `Hello ${u_data['f_name']}, its simple bot for decoding QR codes`

    db.then(db => {
        db.all(getUserById, msg.from.id).then(u => {
            if(u.length == 0) 
            {
                db.run(saveUser, u_data['id'], u_data['f_name'], u_data['state'])
                bot.telegram.sendMessage(u_data['id'], text);
                console.log('Success!')
            } else {
                console.log('User already exists!')
                bot.telegram.sendMessage(u_data['id'], "*"+text+"*", {parse_mode: 'MarkdownV2'});
            }
        })

    })
}


function checkState(msg) 
{
    var user_id = msg.from.id
    db.then(db => {
        db.get(getUserState, user_id).then(v => {
            if(v.state == 1)
            {
                qr_encode(msg)
                bot.telegram.sendPhoto(
                    user_id,
                    {source: './photos/qrcode.png'}, 
                    {caption: '<b>Created by @ksarp_qr_bot</b>', parse_mode: 'HTML', 
                    reply_to_message_id: msg.message_id}
                ).catch(err => console.log(err))
                // ctx.replyWithPhoto({source: './photos/qrcode.jpg'})
                changeState(user_id, 0)
            }
        })
    }).catch(err => console.log(err))
}


function changeState(user_id, state)
{
    db.then(db => {
        db.run(updateState, state, user_id)
    })
}

function qr_encode(msg)
{
    var qr_png = qr.image(msg.text, { type: 'png', size: 50 })
    qr_png.pipe(fs.createWriteStream('./photos/qrcode.png'))
}

function qr_decode(msg, filename) 
{
    var file = fs.readFileSync(`photos/${filename}`)
    var qr = new qrcode()
    
    var options = {
        parse_mode: 'HTML',
        reply_to_message_id: msg.message.message_id
    }

    Jimp.read(file, function(err, image) {
        if(err){
            console.error(err)
            bot.telegram.sendMessage(msg.from.id, `Error: ${err}`)
        }

        qr.callback = function(err, value) {
            if (err) {
                console.log(err)
                bot.telegram.sendMessage(
                    msg.from.id, 
                    `Error: <code>${err}</code>`, options
                );
				fs.unlinkSync(`photos/${filename}`)
            }
            if (value) {
                bot.telegram.sendMessage(msg.from.id, 
                    `<b>Decoded data:</b> <code>${value.result}</code>`, 
                    options
                )
				fs.unlinkSync(`photos/${filename}`)
            }
        }
        qr.decode(image.bitmap)
    })
}


function downloadFile(link, ctx)
{
    const file = fs.createWriteStream("photos/file.jpg");
    const request = https.get(link, function(response) {
        response.pipe(file);

        // after download completed close filestream
        file.on("finish", () => {
            file.close();
            qr_decode(ctx, "file.jpg")
            console.log("Download Completed");
        });
    });
}


bot.start((ctx) => {
    var chat_id = ctx.chat.id
    // ctx.reply('Hello')
    start_msg(ctx.message)
})

bot.on('message', (ctx) => {
    var chat_id = ctx.chat.id
    var msg_id = ctx.message_id

    if(ctx.message.photo != undefined) {
        var index = ctx.update.message.photo.length - 1
        // delay(2500);
        ctx.telegram.getFileLink(ctx.update.message.photo[index]).then(v => {
            console.log(v.href);
            downloadFile(v.href, ctx); 
        })
    } else if(ctx.message.text == '/encode') {
        changeState(ctx.from.id, 1)
        ctx.reply('<b>Send me a text or link</b>', {reply_to_message_id: ctx.message.message_id, parse_mode: 'HTML'})
    } else {
        checkState(ctx.message)
    }
})

console.log('started!')
bot.launch()