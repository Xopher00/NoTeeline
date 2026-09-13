import { useNavigate } from 'react-router-dom'
import {
  FormControl,
  Button,
  Flex,
  Box,
  Heading,
  Text,
} from '@chakra-ui/react'
import { InfoOutlineIcon, WarningTwoIcon } from '@chakra-ui/icons'
import { Typewriter } from 'react-simple-typewriter'

const Home = () => {
  const navigate = useNavigate()

  const handleSubmit = (e: any) => {
    e.preventDefault()
    localStorage.setItem('gptKey', JSON.stringify('ollama'))
    navigate('/note')
  }
  
  return (
    <Flex
      width='full'
      flexDirection='column'
      align='center'
      justify='center'
      style={{ marginTop: '15vh', }}
    >
      <Box mb={10} style={{ fontWeight: '600', fontSize: '18px', }}>
        <Typewriter
          words={['Write, Organize, Review, and Summarize Personalized Notes']}
          cursor
          cursorStyle='_'
          typeSpeed={30}
        />
      </Box>
      <Box
        p={8}
        mb={8}
        minWidth='25vw'
        maxWidth='30vw'
        borderWidth={1}
        borderRadius={8}
        boxShadow='lg'
      >
        <Box textAlign='center'>
          <Heading color='#54432C'>NoTeeline</Heading>
        </Box>
        <Box my={4} textAlign='center'>
          <form>
            <FormControl>
              <Button
                width='half'
                type='submit'
                mt={4}
                colorScheme='teal'
                variant='outline'
                onClick={handleSubmit}
              >
                Continue
              </Button>
            </FormControl>
          </form>
        </Box>
        <Box textAlign='left'>
          <Text fontSize='xs' color='grey' as='em'>
            <InfoOutlineIcon /> Notes are expanded and summarized using a self-hosted local model — nothing leaves this machine.
          </Text>
        </Box>
      </Box>
      <Text fontSize='xs' color='#54432C' as='b'>
        <WarningTwoIcon /> The website might not always be up and running
      </Text>
    </Flex>
   )
}

export default Home
