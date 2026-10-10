import { openai, supabase } from './config.js';
import movies from './content.js'


const formScreen = document.getElementById('form-screen');
const resultScreen = document.getElementById('result-screen');
const submitBtn = document.getElementById('submit-Btn')
const resetBtn = document.getElementById('reset-btn')
const movietitle = document.getElementById('movie-title')
const movieexplanation = document.getElementById('movie-explanation')


const inputs = {
    favorite: document.getElementById('favorite'),
    mood: document.getElementById('mood'),
    vibe: document.getElementById('vibe')
}

submitBtn.addEventListener('click', handleSubmit)
resetBtn.addEventListener('click', handleReset)

async function handleSubmit(){
    
    const answers = {
        favorite: inputs.favorite.value.trim(),
        mood: inputs.mood.value.trim(),
        vibe: inputs.vibe.value.trim()
    }
    
    if(!answers.favorite || !answers.mood || !answers.vibe){
        alert('please answer all three of the questions')
        return
    } 
    
    setLoading(true)
    
    try{
        
        const query = `Favorite movie and why: ${answers.favorite}
            Mood (new or classic): ${answers.mood}
            Fun or serious: ${answers.vibe}`
            
        const embedding = await createEmbedding(query)
        
        const movie = await findBestMatch(embedding)
        if(!movie) throw new Error('No matching movie found.')
        
        const explanation = await getExplanation(movie, query);
        
        showResults(movie, explanation)
        
    }catch(error){
        console.error(error)
        alert('Something went wrong. Please try again.');
    }finally{
        setLoading(false)
    }

}


async function createEmbedding(text){
    const response = await openai.embeddings.create({
        model:'text-embedding-3-small',
        input:text
    })
    return response.data[0].embedding;
}

async function findBestMatch(embedding){
    const { data, error } = await supabase.rpc('match_movies', {
    query_embedding: embedding,
    match_threshold: 0.1,
    match_count: 1
  });
  if (error) throw error;
  return data[0] ?? null;   
}

async function getExplanation(movie , userAnswers){
    
    const messages = [{
        role:'system',
        content: `You are an enthusiastic movie expert who recommends movies to people.
        You will be given a movie description and a person's answers to three questions.
        Explain in 2 to 3 short, friendly sentences why this movie is a great choice for them.
        Refer to what they said, and only use facts from the movie description.
        Do not mention the questions themselves or say "based on your answers".`
        },
        {
         role:'user',
         content:`Movie: ${movie.title} (${movie.release_year})
            Description: ${movie.content}

            Person's answers:
            ${userAnswers}`   
        }]
    const response = await openai.chat.completions.create({
        model:process.env.AI_MODEL,
        messages: messages
    })
    return response.choices[0].message.content
}

function showResults(movie , explanation){
    movietitle.textContent = `${movie.title} (${movie.release_year})`;
    movieexplanation.textContent = explanation;
    formScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
}

function handleReset() {
  Object.values(inputs).forEach(inputs => (inputs.value = ''));
  resultScreen.classList.add('hidden');
  formScreen.classList.remove('hidden');
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? 'Finding your movie...' : "Let's Go";
}


