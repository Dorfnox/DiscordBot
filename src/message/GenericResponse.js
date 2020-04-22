const WaffleResponse = require('./WaffleResponse');
const { getSafe, randomFromArray } = require('../util/WaffleUtil');


class GenericResponse {

  feed(msg) {
    new WaffleResponse().setResponse('OMNOMOMNOMOMNOM').reply(msg);
  }

  how(msg, args) {
    if (args.join(' ').toLowerCase().startsWith('old is ken')) {
      new WaffleResponse().setResponse('Kendron is a baby boi!').reply(msg);
    }
  }

  nani(msg) {
    new WaffleResponse().setResponse("*Nani the fuck did you just fucking iimasu about watashi, you chiisai bitch desuka? Watashi'll have anata know that watashi graduated top of my class in Nihongo 3, and watashi've been involved in iroirona Nihongo tutoring sessions, and watashi have over sanbyaku perfect test scores. Watashi am trained in kanji, and watashi is the top letter writer in all of southern California. Anata are nothing to watashi but just another weeaboo. Watashi will korosu anata the fuck out with vocabulary the likes of which has neber meen mimasu'd before on this continent, mark watashino fucking words. Anata thinks that anata can get away with hanashimasing that kuso to watashi over the intaaneto? Omou again, fucker. As we hanashimasu, watashi am contacting watashino secret netto of otakus accross the USA, and anatano IP is being traced right now so you better junbishimasu for the ame, ujimushi. The ame that korosu's the pathetic chiisai thing anata calls anatano life. You're fucking shinimashita'd, akachan.*").setLogResponseLimit(30).reply(msg);
  }

  ping(msg) {
    new WaffleResponse().setResponse(`PONG! Your ping is **${Date.now() - msg.createdAt.getTime()}ms**`).reply(msg);
  }

  salt(msg) {
    const saltReplies = [
      `:salt:`,
      `WHY ARE YOU BEING SO SALTY`,
      `https://www.youtube.com/watch?v=qDjPCMs7ivU`,
      `https://www.youtube.com/watch?v=xzpndHtdl9A`,
      `http://files.explosm.net/comics/Rob/soup.png`,
      `https://www.amazon.com/Morton-Salt-Regular-26/dp/B0005ZV1CQ`,
      `https://live.staticflickr.com/3953/15738368411_266702863c_b.jpg`,
      `https://ih0.redbubble.net/image.500606301.2517/raf,750x1000,075,t,fafafa:ca443f4786.u1.jpg`
    ];
    getSafe(() => msg.channel.send(randomFromArray(saltReplies)));
  }

  say(msg, args) {
    let text;
    if (Math.random() > 0.14) {
        text = !args.length ? 'Can\'t repeat what isn\'t said, you naughty, naughty person' : args.join(' ');
    } else  {
        text = 'Sorry, I\'m not saying that... I don’t speak bullshit.'
    }
    new WaffleResponse().setResponse(text).reply(msg);
  }
}

module.exports = GenericResponse;