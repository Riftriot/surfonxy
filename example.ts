import cookie from '@elysiajs/cookie';
import { Elysia, t } from 'elysia'

let app = new Elysia();
app.use(cookie()).get('/', ({ cookie: { name } }) => {
  console.log(name);
  return new Response('Hello World',{
    headers:{
      'Set-Cookie':`name=elysia;value=1;path=/;max-age=3600;domain=real-website.com`
    }
  });
})
app.listen(3000);