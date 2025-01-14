import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 4000;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "BookReview",
    password: "AR15@9173",
    port: 5432,
});
db.connect();

var DATA = [];

var orderBy = "id";
var sort = "ASC";
const bookDetails = await intialization();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
/*
db.query(`
    DROP TABLE IF EXISTS review;
    DROP TABLE IF EXISTS notes;
    DROP TABLE IF EXISTS books;
`);
*/
db.query(`
    CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) UNIQUE NOT NULL,
        author VARCHAR(100) NOT NULL,
        isbn VARCHAR(13) UNIQUE,
        cover_url TEXT
    );

    CREATE TABLE IF NOT EXISTS review (
        id SERIAL PRIMARY KEY,
        book_title VARCHAR(100) UNIQUE REFERENCES books(title),
        book_rating VARCHAR(2),
        book_review TEXT,
        review_date DATE
    );

    CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        book_title VARCHAR(100) UNIQUE REFERENCES books(title),
        book_notes TEXT,
        note_date DATE
    );
`);

async function readDatabase() {
    try {
        const dataRead = await db.query(`
            SELECT books.id, books.title, books.author, books.isbn, books.cover_url,
                review.book_rating, review.book_review, review.review_date,
                notes.book_notes, notes.note_date
            FROM ((books
            JOIN review ON books.title = review.book_title)
            JOIN notes ON books.title = notes.book_title)
            ORDER BY ${orderBy} ${sort};
        `);
        //console.log("dataRead.rows : \n", dataRead.rows);
        if (dataRead.rows.length < 1) {
            await postNewReview(bookDetails);
        }
        return dataRead.rows;
    } catch (error) {
        console.log(error);
    }
}
/*  //Code commented below is just for reference.
    //DO NOT UNCOMMENT the code below!
    
    const newdata = {
        booktitle: req.body.title,
        bookauthor: req.body.author,
        bookrating: req.body.rating,
        bookreview: req.body.review,
        bookisbn: req.body.isbn,
        bookdate: req.body.date,
        booknote: req.body.note,
    }; 
*/
async function postNewReview(post) {
    //console.log("post : \n", post);
    try {
        await db.query(`
            INSERT INTO books (title, author, isbn, cover_url)
            VALUES ('${post.booktitle}', '${post.bookauthor}', '${post.bookisbn}', 'https://covers.openlibrary.org/b/isbn/${post.bookisbn}-L.jpg');

            INSERT INTO review (book_title, book_rating, book_review, review_date)
            VALUES ('${post.booktitle}', '${post.bookrating}', '${post.bookreview}', '${post.bookdate}');

            INSERT INTO notes (book_title, book_notes, note_date)
            VALUES ('${post.booktitle}', '${post.booknote}', '${post.bookdate}');
        `);
    } catch (error) {
        console.log(error);
    }
}

async function postUpdateReview(data) {
    //console.log("data :\n", data);
    try {
        await db.query(`
            UPDATE books
            SET author = '${data.bookauthor}', isbn = '${data.bookisbn}', cover_url = 'https://covers.openlibrary.org/b/isbn/${data.bookisbn}-L.jpg'
            WHERE title = '${data.booktitle}';

            UPDATE review
            SET book_rating = '${data.bookrating}', book_review = '${data.bookreview}'
            WHERE book_title = '${data.booktitle}';

            UPDATE notes
            SET book_notes = '${data.booknote}'
            WHERE book_title = '${data.booktitle}';
        `);
    } catch (error) {
        console.log(error);
    }
}

if (DATA.length < 1) {
    DATA = await readDatabase();
}


app.get("/", async (req, res) => {
    DATA = await readDatabase();
    //console.log("DATA :\n", DATA);

    const data = {
        pageTitle: "The Note",
        bookdata: DATA,
    };

    res.render("index.ejs", { content: data });
});

app.get("/home", (req, res) => { 
    res.redirect("/");
    orderBy = "id";
    if (sort === "ASC") {
        sort = "DESC";
    } else {
        sort = "ASC";
    }
});

app.get("/sort/title", (req, res) => { 
    orderBy = "title";
    if (sort === "ASC") {
        sort = "DESC";
    } else {
        sort = "ASC";
    }
    res.redirect("/");
});

app.get("/sort/newest", (req, res) => { 
    orderBy = "review_date";
    if (sort === "ASC") {
        sort = "DESC";
    } else {
        sort = "ASC";
    }
    res.redirect("/");
});

app.get("/sort/best", (req, res) => {
    orderBy = "book_rating";
    if (sort === "ASC") {
        sort = "DESC";
    } else {
        sort = "ASC";
    }
    res.redirect("/");
});

app.post("/view-note", (req, res) => {
    const noteisbn = req.body.isbn;
    //console.log("DATA.find : \t", DATA.find((note) => note.isbn === noteisbn));

    const data = {
        pageTitle: "The Note | View Note",
        bookdata: DATA.find((note) => note.isbn === noteisbn),
    };

    res.render("note.ejs", { content: data });
});

app.get("/new", (req, res) => {
    const data = {
        pageTitle: "The Note | New Note",
    };

    res.render("new.ejs", { content: data });
});

app.post("/new/post", async (req, res) => {
    const newdata = {
        booktitle: req.body.title.trim(),
        bookauthor: req.body.author.trim(),
        bookrating: req.body.rating,
        bookreview: req.body.review.trim(),
        bookisbn: req.body.isbn,
        bookdate: req.body.date,
        booknote: req.body.note.trim(),
    };
    //console.log(newdata);

    for (let i = 0; i < newdata.bookreview.length; i++) {
        if (newdata.bookreview[i] == "'") {
            newdata.bookreview = newdata.bookreview.slice(0, i) + "’" + newdata.bookreview.slice(i + 1);
        }
    }

    for (let i = 0; i < newdata.booknote.length; i++) {
        if (newdata.booknote[i] == "'") {
            newdata.booknote = newdata.booknote.slice(0, i) + "’" + newdata.booknote.slice(i + 1);
        }
    }

    await postNewReview(newdata);

    res.redirect("/");
});

app.post("/edit", (req, res) => {
    const isbn = req.body.editisbn;
    const data = {
        pageTitle: "The Note | Edit Note",
        bookdata: DATA.find((note) => note.isbn === isbn),
    };
    res.render("edit.ejs", { content: data });
});

app.post("/edit/post", async (req, res) => {
    const previousData = DATA.find((book) => book.title === req.body.title.trim());
    //console.log(previousData);
    //console.log(req.body);

    const data = {
        booktitle: previousData.title,
        bookauthor: req.body.author.trim() || previousData.author,
        bookrating: req.body.rating || previousData.book_rating,
        bookreview: req.body.review.trim() || previousData.book_review,
        bookisbn: req.body.isbn || previousData.isbn,
        booknote: req.body.note.trim() || previousData.book_notes,
    };
    //console.log(data.bookrating);
    //console.log(data.booktitle);

    for (let i = 0; i < data.bookreview.length; i++) {
        if (data.bookreview[i] == "'") {
            data.bookreview = data.bookreview.slice(0, i) + "’" + data.bookreview.slice(i + 1);
        }
    }

    for (let i = 0; i < data.booknote.length; i++) {
        if (data.booknote[i] == "'") {
            data.booknote = data.booknote.slice(0, i) + "’" + data.booknote.slice(i + 1);
        }
    }

    await postUpdateReview(data);

    res.redirect("/");
});

app.post("/delete", async (req, res) => {
    const deleteItem = DATA.find((post) => post.isbn === req.body.deleteisbn);

    try {
        await db.query(`
            DELETE FROM review
            WHERE book_title = '${deleteItem.title}';

            DELETE FROM notes
            WHERE book_title = '${deleteItem.title}';

            DELETE FROM books
            WHERE title = '${deleteItem.title}';
        `);

        res.redirect("/");
    } catch (error) {
        console.log(error);
        res.send(400);
    }
});


app.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}`);
});

async function intialization() {
    const Details = {
            booktitle: "The Willpower Instinct",
            bookauthor: "Kelly McGonigal",
            bookrating: 9,
            bookreview: "Amazing book about willpower from Stanford psychology professor who teaches just this. Killer first point: The best way to improve your self-control is to see how and why you lose control. This is a better book than the other book on Willpower here on my list, because it’s more actionable, better written, better presented. Really amazing (IF you act on it!)",
            bookisbn: 1583334386,
            bookdate: "2013-02-05",
            booknote: `The best way to improve your self-control is to see how and why you lose control.

    People who think they have the most willpower are actually the most likely to lose control when tempted.
    Why? They fail to predict when, where, and why they will give in.

    What is something that you would like to do more of, or stop putting off, because you know that doing it will improve the quality of your life?

    What is the “stickiest” habit in your life? What would you like to give up or do less of because it’s undermining your health, happiness, or success?

    What is the most important long-term goal you’d like to focus your energy on?
    What immediate “want” is most likely to distract you or tempt you away from this goal?

    To say no when you need to say no, and yes when you need to say yes, you need to remember what you really want.

    The main job of the modern prefrontal cortex is to bias the brain toward doing “the harder thing.”

    Every willpower challenge requires doing something difficult, whether it’s walking away from temptation or not running away from a stressful situation.
    Imagine yourself facing your specific willpower challenge.
    What is the harder thing?
    What makes it so difficult?
    How do you feel when you think about doing it?

    Some people find it useful to give a name to the impulsive mind, like “the cookie monster” to the part of you that always wants instant gratification. Giving a name to this version of yourself can help you recognize when it is taking over, and also help you call in your wiser self for some willpower support.

    Without desires we’d become depressed.

    People who are distracted are more likely to give in to temptations.

    Develop more self-awareness.

    Notice when you are making choices related to your willpower challenge.

    Catch yourself earlier and earlier in the process, noticing what thoughts, feelings, and situations are most likely to prompt the impulse.

    What do you think or say to yourself that makes it more likely that you will give in?

    The brain is remarkably responsive to experience. Ask your brain to do math every day, and it gets better at math. Ask your brain to worry, and it gets better at worrying. Ask your brain to concentrate, and it gets better at concentrating. Not only does your brain find these things easier, but it actually remodels itself based on what you ask it to do.

    Meditating makes you better at a wide range of self-control skills, including attention, focus, stress management, impulse control, and self-awareness.

    People who meditate regularly become finely tuned willpower machines.

    This simple act of staying still is part of what makes meditation willpower training effective. You’re learning to not automatically follow every single impulse.

    What is the harder thing? Imagine yourself facing your willpower challenge, and doing the harder thing. What makes it hard?

    We’re used to seeing temptation and trouble outside of ourselves: the dangerous doughnut, the sinful cigarette, the enticing Internet. But identify the inner impulse that needs to be restrained.
    What is the thought or feeling that makes you want to do whatever it is you don’t want to do?

    Next time you’re tempted, turn your attention inward.

    The pause-and-plan response: The most helpful response will be to slow you down, not speed you up (as a fight-or-flight response does).

    One way to immediately boost willpower: Slow your breathing down to four to six breaths per minute.

    The biggest mood-boosting, stress-busting effects came from five-minute doses of exercise.

    Anything above and beyond the typical sedentary lifestyle will improve your willpower reserve.

    Shorter bursts have a more powerful effect on your mood than longer workouts. You also don’t have to break a sweat or push yourself to exhaustion. Lower-intensity exercise, like walking, has stronger immediate effects than high-intensity exercise.

    He started to use the treadmill each morning to fuel up with willpower for the day’s difficult meetings and long hours.

    Why does poor sleep sap willpower?

    When you’re tired, your cells have trouble absorbing glucose from the bloodstream. This leaves them underfueled, and you exhausted. With your body and brain desperate for energy, you’ll start to crave sweets or caffeine.

    Stress is the enemy of willpower. So often we believe that stress is the only way to get things done, and we even look for ways to increase stress.

    Or we use stress to try to motivate others, but in the long term, nothing drains willpower faster than stress.

    Does being hungry or tired drain your willpower?

    Or emotions like anger, loneliness, or sadness?

    Self-control is highest in the morning and steadily deteriorates over the course of the day.

    Anytime you have to fight an impulse, filter out distractions, weigh competing goals, or make yourself do something difficult, you use a little more of your willpower strength.

    Pay attention to when you have the most willpower, and when you are most likely to give in.

    For your “I will” challenge, schedule it for when you have the most strength.

    When your blood sugar drops, your brain will still favor short-term thinking and impulsive behavior.

    Committing to any small, consistent act of self-control - improving your posture, squeezing a handgrip every day to exhaustion, cutting back on sweets, and keeping track of your spending - can increase overall willpower.

    Through each of these willpower exercises, the brain gets used to pausing before acting.

    • Strengthen “I Won’t” Power: Commit to not crossing your legs when you sit, or using your nondominant hand for a daily task
    • Strengthen “I Will” Power: Commit to doing something every day meditating for five minutes
    • Strengthen Self-Monitoring: Formally keep track of something you don’t usually pay close attention to. This could be your spending, what you eat, or how much time you spend online

    If your goal is to exercise more often, you might decide to do ten sit-ups or push-ups before your morning shower.

    Leaving candy out in a visible place can increase people’s general self-control (if they routinely resist the temptation).

    Despite the feeling of exhaustion that made it seem as though her feet and legs would not cooperate, they did. Whenever she thought, I can’t do this, she said to herself, “You are doing this,” and just kept putting one foot in front of the other, all the way to the finish line.

    Endurance athletes under extreme conditions: They found no evidence for physiological failure happening within the muscles; instead, it appeared that the brain was telling the muscles to stop.

    The brain creates an overwhelming feeling of fatigue that has little to do with the muscles’ capacity to keep working.

    Fatigue should no longer be considered a physical event but rather a sensation or emotion.

    In much the same way that the feeling of anxiety can stop us from doing something dangerous, our beliefs about what we are capable of may determine whether we give up or soldier on.

    The widely observed scientific finding that self-control is limited may reflect people’s beliefs about willpower, not their true physical and mental limits.

    The next time you find yourself “too tired” to exert self-control, challenge yourself to go beyond that first feeling of fatigue.

    When your willpower is running low, find renewed strength by tapping into your want power. For your biggest willpower challenge, consider the following motivations:
    How will you benefit from succeeding at this challenge?
    Who else will benefit if you succeed at this challenge?

    Imagine that this challenge will get easier for you over time if you are willing to do what is difficult now.

    Erin had to realize that staying calm was as much for herself as it was for her sons.

    See if there is another “want” that holds more power for you.

    Think about how we can best support the most exhausted version of ourselves - and not count on an ideal version of ourselves to show up and save the day.

    Train like an intelligent athlete, pushing our limits but also pacing ourselves.

    The exception to our usual desire to be consistent. When it comes to right and wrong, most of us are not striving for moral perfection. We just want to feel good enough - which then gives us permission to do whatever we want.

    Moral licensing: When you do something good, you feel good about yourself. This means you’re more likely to trust your impulses - which often means giving yourself permission to do something bad.

    People who first remember a time when they acted generously give 60 percent less money to a charitable request.

    Anything you moralize becomes fair game for the effect of moral licensing. If you tell yourself that you’re “good” when you exercise and “bad” when you don’t, then you’re more likely to skip the gym tomorrow if you work out today.

    This sense of entitlement too often becomes our downfall. Because we’re quick to view self-indulgence as the best reward for virtue, we forget our real goals and give in to temptation.

    When you feel like a saint, the idea of self-indulgence doesn’t feel wrong. It feels right. Like you earned it. And if the only thing motivating your self-control is the desire to be a good enough person, you’re going to give in whenever you’re already feeling good about yourself.

    It tricks us into acting against our best interests. It convinces us that self-sabotaging behavior - like having a smoke - is a “treat.”

    Human nature - we resist rules imposed by others for our own good.

    When you tell yourself that exercising, saving money, or giving up smoking is the right thing to do - not something that will help you meet your goals - you’re less likely to do it consistently.

    As she burned more calories, she couldn’t help imagining the food she was earning the right to eat.

    Making progress on a goal motivates people to engage in goal-sabotaging behavior.

    Self-control success has an unintended consequence: It temporarily satisfies - and therefore silences - the higher self.

    He loves productivity seminars because they make him feel so productive - never mind that nothing has been produced yet.

    Focusing on progress can hold us back from success.

    Progress can be motivating, and even inspire future self-control, but only if you view your actions as evidence that you are committed to your goal.

    You need to look at what you have done and conclude that you must really care about your goal, so much so that you want to do even more to reach it.

    People who are asked, “How committed do you feel to your goal?” are not tempted by the conflicting behavior.

    Actions need to be driven by “I did that because I wanted to,” NOT “I did that, great, now I can do what I really want!”

    Remember why you resisted. Remembering the “why” works because it changes how you feel about the reward of self-indulgence. That so-called treat will start to look more like the threat to your goals.

    The next time you find yourself using past good behavior to justify indulging, pause and remember the why.

    When McDonald’s added healthier items to its menu, sales of Big Macs skyrocketed.

    The mind gets so excited about the opportunity to act on a goal, it mistakes that opportunity with the satisfaction of having actually accomplished the goal.

    We wrongly predict we will have much more free time in the future than we do today.

    They asked a whole bunch of people to predict, “How many times per week (on average) will you exercise in the next month?” Then they asked another group of people the same question, with one important preface: “In an ideal world, how many times per week will you exercise in the next month?” The two groups showed no differences!

    We look into the future and fail to see the challenges of today.

    When you want to change a behavior, aim to reduce the variability in your behavior, not the behavior itself.

    Deprive yourself of the usual cognitive crutch of pretending that tomorrow will be different.

    View every choice you make as a commitment to all future choices. So instead of asking, “Do I want to eat this candy bar now?” ask yourself, “Do I want the consequences of eating a candy bar every afternoon for the next year?”

    Instead of asking “Would I rather do this today or tomorrow?” ask yourself, “Do I really want the consequences of always putting this off?”

    People who order a main dish advertised as a healthy choice also order more indulgent drinks, side dishes, and desserts. Although their goal is to be healthy, they end up consuming more calories than people who order a regular entrée. Dieting researchers call this a health halo. We feel so good about ordering something healthy, our next indulgence doesn’t feel sinful at all.

    Permission to indulge in something by focusing on its most virtuous quality? Magic words that give you permission to indulge, like “Buy 1 Get 1 Free,” “All Natural,” “Light,” “Fair Trade,” “Organic.”

    Any type of positive change requires knowing that who we are is the self that wants the best for us - and the self that wants to live in line with our core values. When this happens, we will no longer view the impulsive, lazy, or easily tempted self as the “real” us. We will no longer act like someone who must be bribed, tricked, or forced to pursue our goals, and then rewarded for making any effort at all.

    Do you identify more with your impulses and desires, or with your long-term goals and values?

    The promise of happiness - not the direct experience of happiness - is the brain’s strategy to keep you hunting, gathering, working, and wooing.

    When we add the instant gratification of modern technology to this primitive motivation system, we end up with dopamine-delivery devices that are damn near impossible to put down.

    Do you know what your own dopamine triggers are?

    Pay attention to what captures your attention. What unleashes that promise of reward that compels you to seek satisfaction?

    The website of Scent Air, a leader in the field of scent marketing, 18 brags about how it lured visitors into an ice cream parlor on the lower level of a hotel. With a strategically placed aroma-delivery system, they released the scent of sugar cookies to the top of the stairs and waffle cones to the bottom. The average passerby will think she is inhaling the authentic smell of the sweet treats. Instead, she is breathing in enhanced chemicals designed to maximize the firing of her dopamine neurons and lead her - and her wallet - straight down the stairs.

    The promise of reward is so powerful that we continue to pursue things that don’t make us happy, and consume things that bring us more misery than satisfaction.

    If you force your brain to reconcile what it expects from a reward - happiness, bliss, satisfaction, an end to sadness or stress - with what it actually experiences, your brain will eventually adjust its expectations.

    When we free ourselves from the false promise of reward, we often find that the thing we were seeking happiness from was the main source of our misery.

    The solution is not to eliminate wanting.

    Separate the real rewards that give our lives meaning from the false rewards that keep us distracted and addicted.

    Why does stress lead to cravings? Stress - including negative emotions like anger, sadness, self-doubt, and anxiety - shifts the brain into a reward-seeking state. You end up craving whatever substance or activity your brain associates with the promise of reward, and you become convinced that the “reward” is the only way to feel better.

    What do you turn to when you’re feeling stressed, anxious, or down?

    Some strategies really work: The most effective stress-relief strategies are exercising or playing sports, praying or attending a religious service, reading, listening to music, spending time with friends or family, getting a massage, going outside for a walk, meditating or doing yoga, and spending time with a creative hobby. (The least effective strategies are gambling, shopping, smoking, drinking, eating, playing video games, surfing the Internet, and watching TV or movies for more than two hours.)

    Terror creates an immediate need to do something to counter our feelings of powerlessness. We will reach for our security blankets, whatever makes us feel safe, powerful, or comforted.

    Dieters would feel so bad about any lapse - a piece of pizza, a bite of cake - that they felt as if their whole diet was blown. Instead of minimizing the harm by not taking another bite, they would say, “What the hell, I already blew my diet. I might as well eat the whole thing.”

    Pay special attention to how you handle any willpower failure.
    Do you criticize yourself and tell yourself that you’ll never change?
    Do you use the setback as an excuse to indulge further?

    Self-criticism is consistently associated with less motivation and worse self-control.

    Surprisingly, it’s forgiveness, not guilt, that increases accountability. Researchers have found that taking a self-compassionate point of view on a personal failure makes people more likely to take personal responsibility for the failure.

    We are most likely to decide to change when we are at a low point:

    Setting a resolution offers an immediate sense of relief and control. We don’t have to believe that we are the person who made that mistake; we can become a completely different person. Vowing to change fills us with hope. We love to imagine how making the change will transform our lives, and we fantasize about the person we will become.

    The decision to change is the ultimate in instant gratification - you get all the good feelings before anything’s been done.

    It was never meant to be a strategy for change. It’s a strategy for feeling better.

    Resolving to change is, for most people, the best part of the change process. It’s all downhill after that.

    Predicting how and when you might be tempted to break your vow increases the chances that you will keep a resolution.

    Ask yourself:
    When am I most likely to be tempted to give in?
    How am I most likely to let myself get distracted from my goal?
    What will I say to myself to give myself permission to procrastinate?
    When you have such a scenario in mind, imagine yourself in that situation, what it will feel like, and what you might be thinking. Let yourself see how a typical willpower failure unfolds. Then turn this imaginary failure into a willpower success. Consider what specific actions you could take to stick to your resolution.

    We humans have all sorts of mental tricks for convincing ourselves that the time to resist temptation is tomorrow.

    Delay discounting - the longer you have to wait for a reward, the less it is worth to you.

    Delay discounting explains why we choose immediate satisfaction at the cost of future happiness.

    Ask yourself what future rewards do you put on sale each time you give in to temptation or procrastination.
    What is the immediate payoff for giving in?
    What is the long-term cost?
    Is this a fair trade?

    Immediate reward triggers dopamine-induced desire.
    Future rewards delay gratification, the prefrontal cortex has to cool off the promise of reward.

    With distance between you and the temptation, the power of balance shifts back to the brain’s system of self-control.

    When immediate gratification comes with a mandatory ten-minute delay, the brain treats it like a future reward.

    For a cooler, wiser brain, institute a mandatory ten-minute wait for any temptation.

    To help you overcome the temptation to procrastinate. Flip the rule to “Do ten minutes, then you can quit.” When your ten minutes are up, give yourself permission to stop.

    1. When you are tempted to act against your long-term interests, frame the choice as giving up the best possible long-term reward for whatever the immediate gratification is.
    2. Imagine that long-term reward as already yours. Imagine your future self enjoying the fruits of your self-control.
    3. Then ask yourself: Are you willing to give that up in exchange for whatever fleeting pleasure is tempting you now?

    Cortés burned those ships to guarantee that his men didn’t act on their fear. No choice but to go forward. Precommitment.

    (you think:) Future you always has more time, more energy, and more willpower than present you.

    We think about our future selves like different people. We often idealize them, expecting our future selves to do what our present selves cannot.

    Could fund-raisers exploit the future-self bias by asking people to pledge their future selves’ money instead of giving money now?

    Getting to know their future selves made the students more willing to invest in them - and, by extension, themselves.

    Think about what your future self will be doing, and how he or she will feel about the choices you’re making now?

    Do you have a hard time taking a break from work because there is always more to do?
    Do you feel so guilty or anxious about spending money that you find it hard to purchase anything beyond the absolute basics?
    Do you ever look back at how you have spent your time and money, and wish you had been more focused on your present happiness instead of always putting it off?
    If so, take the willpower experiments in this chapter and turn them into strategies for self-indulgence.

    The least-fit cadet in a squadron gradually brought down the fitness levels of the other cadets.

    Behaviors we typically view as being under self-control are, in important ways, under social control as well.

    Chaining bicycles to a fence right next to a prominent “No Bicycles” sign, and leaving grocery carts in a parking garage with a “Please Return Your Carts to the Store” policy. Their studies show that rule-breaking is contagious. People who stumble into the researchers’ setup take their cues from what other people have done, and ignore the signs. They, too, chain up their bikes and leave their carts in the garage. But the consequences go further than that. When people saw a bike chained to a no-bicycles fence, they were also more likely to take an illegal shortcut through the fence. When they saw carts in a parking garage, they were more likely to dump their trash on the floor of the garage.

    Is there someone who can serve as a willpower role model for your challenge? Someone who has struggled with the same challenge and succeeded, or someone who exemplifies the kind of self-control you would like to have?

    Thought suppression doesn’t work.

    When you try to push a thought away, and it keeps coming back to your mind, you are more likely to assume that it must be true.

    Because it’s easy to remember news stories about plane crashes, we tend to overestimate the likelihood of being in a crash.

    A distraught student who couldn’t stop thinking about killing herself. A fleeting thought had gotten lodged in her brain, and she had become convinced that she must really, deep down, want to kill herself. Otherwise, why would the idea keep intruding into her thoughts?

    Permission to think a thought reduces the likelihood of thinking it.

    The more you try to suppress negative thoughts, the more likely you are to become depressed.

    When people try to push away self-critical thoughts (“I’m such a loser,” “People think I’m stupid”), their self-esteem and mood plummet faster.

    People who try to suppress their fear before giving a public speech not only feel more anxious, but also have higher heart rates.

    Feel what you feel, but don’t believe everything you think.

    Restricting a food automatically increases your cravings for it.

    Try applying this advice to your own most challenging cravings, be they chocolate, cappuccinos, or checking e-mail.

    Notice that you are thinking about your temptation.

    Accept the thought or feeling without trying to immediately distract yourself.

    Step back by realizing that thoughts and feelings aren’t always under your control, but you can choose whether to act on them.

    Remember your goal. Remind yourself of whatever your commitment is.

    Surf the urge: When the urge takes hold, pause for a moment to sense your body.
    What does the urge feel like?
    Is it hot or cold?
    Do you feel tension anywhere in your body?
    What’s happening with your heart rate, your breathing, or your gut?
    Stay with the sensations for at least one minute.

    Surfing the urge is not just for addiction; it can help you handle any destructive impulse.`,
    };

    return Details;
}