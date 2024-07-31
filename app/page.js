'use client';
import { useSession } from 'next-auth/react';
import { Box, Typography, Button, Stack, CircularProgress, Backdrop, Modal, Select, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import HeaderBox from './HeaderBox'; // Adjust the path as needed
import { firestore } from '@/firebase';
import { collection, getDocs, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useEffect, useState, useRef } from 'react';
import AddRemoveItemBox from './AddRemoveItemBox'; // Adjust the path as needed
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { gsap } from 'gsap';

export default function Home() {
  const { data: session } = useSession();
  const [pantry, setPantryList] = useState([]);
  const [itemCounts, setItemCounts] = useState({});
  const [recipes, setRecipes] = useState([]); // State for storing generated recipes
  const [currentRecipe, setCurrentRecipe] = useState(null); // State for the currently generated recipe
  const [selectedRecipe, setSelectedRecipe] = useState(null); // State for the selected recipe
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const [selectedNationality, setSelectedNationality] = useState('');

  useEffect(() => {
    if (session) {
      resetPantry();
    }
  }, [session]);

  useEffect(() => {
    removeZeroQuantityItems();
  }, [itemCounts]);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
      );
    }
  }, [containerRef]);

  const resetPantry = async () => {
    const pantryCollection = collection(firestore, 'pantry');
    const snapshots = await getDocs(pantryCollection);

    // Delete existing items in the pantry collection
    snapshots.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });

    // Initialize with default values (if any)
    const defaultPantryItems = ['Apple', 'Banana', 'Carrot'];
    defaultPantryItems.forEach(async (item) => {
      const itemRef = doc(firestore, 'pantry', item.toLowerCase());
      await setDoc(itemRef, {});
    });

    updatePantryList();
  };

  const updatePantryList = async () => {
    const snapshots = query(collection(firestore, 'pantry'));
    const docs = await getDocs(snapshots);
    const pantryList = [];
    docs.forEach((doc) => {
      pantryList.push(capitalizeFirstLetter(doc.id));
    });
    setPantryList(pantryList);

    const initialCounts = {};
    pantryList.forEach(item => {
      initialCounts[item] = 0;
    });
    setItemCounts(initialCounts);
  };

  const capitalizeFirstLetter = (str) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const handleIncrement = (item) => {
    setItemCounts(prevCounts => ({
      ...prevCounts,
      [item]: prevCounts[item] + 1
    }));
  };

  const handleDecrement = (item) => {
    setItemCounts(prevCounts => ({
      ...prevCounts,
      [item]: prevCounts[item] > 0 ? prevCounts[item] - 1 : 0
    }));

    if (itemCounts[item] === 1) {
      handleRemoveItem(item);
    }
  };

  const handleAddItem = async (newItem) => {
    const capitalizedItem = capitalizeFirstLetter(newItem);
    if (!pantry.includes(capitalizedItem)) {
      const newDocRef = doc(firestore, 'pantry', capitalizedItem.toLowerCase());
      await setDoc(newDocRef, {});
      setPantryList(prevList => [...prevList, capitalizedItem]);
      setItemCounts(prevCounts => ({ ...prevCounts, [capitalizedItem]: 1 }));
    } else {
      handleIncrement(capitalizedItem);
    }
  };

  const handleRemoveItem = async (item) => {
    const itemRef = doc(firestore, 'pantry', item.toLowerCase());
    await deleteDoc(itemRef);
    setPantryList(prevList => prevList.filter(pantryItem => pantryItem !== item));
    setItemCounts(prevCounts => {
      const { [item]: _, ...newCounts } = prevCounts;
      return newCounts;
    });
  };

  const savePantryContents = () => {
    return pantry.map(item => ({
      name: item,
      count: itemCounts[item]
    }));
  };

  const handleCreateRecipeClick = async () => {
    setLoading(true);
    setOpen(true);
    setCurrentRecipe(null); // Reset current recipe before generating a new one
    const pantryContents = savePantryContents();
    const descriptions = pantryContents.map(item => `${item.name}: ${item.count}`).join(', ');

    try {
      const recipe = await _generateRecipe(descriptions, selectedNationality);
      setCurrentRecipe(recipe);
      setRecipes(prevRecipes => [...prevRecipes, recipe]); // Save the recipe to the list
    } catch (error) {
      console.error('Error generating recipe:', error);
      setCurrentRecipe('Error generating recipe.');
    } finally {
      setLoading(false);
    }
  };

  const _generateRecipe = async (descriptions, nationality) => {
    const url = process.env.NEXT_PUBLIC_GEMINI_API_URL;
    const requestPayload = {
      contents: [
        {
          parts: [
            { text: 'input: Pantry Descriptions ' },
            { text: descriptions },
            {
              text:
                `output: Write a recipe based on these pantry descriptions, with a ${nationality} twist. The recipe should include ingredients and step-by-step instructions. `
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
      return _formatResponse(response.data);
    } else {
      throw new Error(`Error: ${response.status}`);
    }
  };

  const _formatResponse = (data) => {
    if (data == null) return 'Error: Null response data';
    if (data.candidates == null) return 'Error: No candidates found in response';

    const candidates = data.candidates;
    if (candidates.length === 0) return 'Error: Candidates are empty';

    return candidates.map(candidate => {
      const content = candidate.content;
      if (content == null || content.parts == null) return 'Error: Missing content or parts in candidate';

      const parts = content.parts;
      const textParts = parts.filter(part => part.text != null);
      return textParts.map(part => part.text).join('\n');
    }).join('\n');
  };

  const removeZeroQuantityItems = () => {
    const updatedPantryList = pantry.filter(item => itemCounts[item] > 0);
    setPantryList(updatedPantryList);
  };

  const handleRecipeClick = (recipe) => {
    setSelectedRecipe(recipe);
    setOpen(true);
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      width="100%"
      height="100vh"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'transparent'
      }}
      ref={containerRef}
    >
      <HeaderBox session={session} />
      <Box display="flex" justifyContent="space-between" width="100%">
        <Box flex="1">
          <AddRemoveItemBox
            pantry={pantry}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateRecipeClick}
            sx={{ margin: 2 }}
          >
            Create Recipe
          </Button>
          <Box sx={{ margin: 2 }}>
            <Typography variant="h6" color="black">Select Nationality</Typography>
            <Select
              value={selectedNationality}
              onChange={(e) => setSelectedNationality(e.target.value)}
              displayEmpty
              inputProps={{ 'aria-label': 'Select Nationality' }}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="" disabled>Select Nationality</MenuItem>
              <MenuItem value="srilankan">Sri Lankan</MenuItem>
              <MenuItem value="indian">Indian</MenuItem>
              <MenuItem value="french">French</MenuItem>
              <MenuItem value="italian">Italian</MenuItem>
              <MenuItem value="mexican">Mexican</MenuItem>
              {/* Add more nationalities as needed */}
            </Select>
          </Box>
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'scroll',
              height: '25vh', // Added height to restrict and make it scrollable
              padding: 2,
              mt: 4,
            }}
          >
            <Stack
              spacing={2}
              sx={{ width: '100%', maxWidth: 600, flexWrap: 'wrap', display: 'flex', gap: 2 }}
            >
              {pantry.map((item) => (
                <Box
                  key={item}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  p={2}
                  border={1}
                  borderColor="grey.300"
                  borderRadius={1}
                  sx={{
                    background: 'linear-gradient(45deg, blue, lightblue)',
                    minWidth: 'calc(33.33% - 16px)',
                    boxSizing: 'border-box'
                  }}
                >
                  <Typography variant="h6">{item}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => handleDecrement(item)}
                    >
                      <RemoveIcon />
                    </Button>
                    <Typography variant="h6">{itemCounts[item]}</Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => handleIncrement(item)}
                    >
                      <AddIcon />
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
        <Box
          flex="1"
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            padding: 2,
            mt: 4,
            ml: 2,
            borderLeft: '1px solid grey'
          }}
        >
          <Typography variant="h5" mb={2} color="black">Saved Recipes</Typography>
          {recipes.map((recipe, index) => (
            <Box
              key={index}
              p={2}
              mb={2}
              border={1}
              borderColor="grey.300"
              overflowY="scroll"
              height="25vh"
              borderRadius={1}
              bgcolor="white"
              onClick={() => handleRecipeClick(recipe)} // Make recipe clickable
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'lightgrey',
                },
                wordWrap: 'break-word',
                overflowWrap: 'break-word' // Ensures words break and wrap correctly
              }}
            >
              <ReactMarkdown alignItems="center">
                {`Saved Recipe ${index + 1}`}
              </ReactMarkdown>
            </Box>
          ))}
        </Box>
      </Box>
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={open}
        onClick={() => setOpen(false)}
      >
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <Box
            sx={{
              bgcolor: 'black',
              borderRadius: '8px',
              p: 4,
              boxShadow: 24,
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <Typography variant="h6" component="h2" id="modal-title">
              {loading ? 'Generating Recipe' : 'Saved Recipe'}
            </Typography>
            <Box
              mt={2}
              display="flex"
              justifyContent="center"
              alignItems="center"
              flexDirection="column"
              height="100%"
            >
              {loading ? (
                <CircularProgress color="inherit" />
              ) : (
                <Typography id="modal-description">
                  <ReactMarkdown>{selectedRecipe || currentRecipe}</ReactMarkdown>
                </Typography>
              )}
            </Box>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setOpen(false)}
              sx={{ mt: 2 }}
            >
              Close
            </Button>
          </Box>
        </Modal>
      </Backdrop>
    </Box>
  );
}