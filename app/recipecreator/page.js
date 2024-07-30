// app/recipecreator/page.js
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import axios from 'axios';

const RecipeCreator = () => {
  const router = useRouter();
  const { pantryContents } = router.query;

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pantryContents) {
      const generateRecipe = async () => {
        const descriptions = JSON.parse(pantryContents).map(item => `${item.name}: ${item.count}`).join(', ');
        try {
          const recipe = await _generateRecipe(descriptions);
          setRecipe(recipe);
        } catch (error) {
          console.error('Error generating recipe:', error);
        } finally {
          setLoading(false);
        }
      };
      generateRecipe();
    }
  }, [pantryContents]);

  const _generateRecipe = async (descriptions) => {
    const url = process.env.NEXT_PUBLIC_GEMINI_API_URL;
    const requestPayload = {
      contents: [
        {
          parts: [
            { text: 'input: Pantry Descriptions ' },
            { text: descriptions },
            {
              text:
                'output: Write a recipe based on these pantry descriptions. The recipe should include ingredients and step-by-step instructions.'
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.95,
        topK: 25,
        topP: 0.95,
        maxOutputTokens: 1000,
        stopSequences: []
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ]
    };

    const response = await axios.post(url, requestPayload, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 200) {
      const responseData = response.data;
      const recipe = _formatResponse(responseData);
      return recipe;
    } else {
      throw new Error(`Error: ${response.status}`);
    }
  };

  const _formatResponse = (data) => {
    if (data == null) return 'Error: Null response data';
    if (data.candidates == null) return 'Error: No candidates found in response';

    const candidates = data.candidates;
    if (candidates.length === 0) return 'Error: Candidates are empty';

    const answer = candidates.map(candidate => {
      const content = candidate.content;
      if (content == null || content.parts == null) return 'Error: Missing content or parts in candidate';

      const parts = content.parts;
      const textParts = parts.filter(part => part.text != null);
      return textParts.map(part => part.text).join('\n');
    }).join('\n');

    return answer;
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
    >
      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <Typography variant="h4" gutterBottom>
            Generated Recipe
          </Typography>
          <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
            {recipe}
          </Typography>
        </>
      )}
    </Box>
  );
};

export default RecipeCreator;
