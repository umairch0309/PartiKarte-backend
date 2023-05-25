import express from 'express';
import { businessUsers } from './routes/business-users.js';
import { events } from './routes/events.js';
import { tickets } from './routes/tickets.js';
import { contact } from './routes/contact.js';
import { documents } from './routes/documents.js';
import cors from 'cors'
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

// Extended: https://swagger.io/specification/#infoObject
const swaggerOptions = {
    definition: {
      openapi: '3.0.0',  // This is the important line
      info: {
        title: 'PARTIKARTE API',
        description: 'PARTIKARTE API is an api for managing event tickets.',
        contact: {
          name: 'MAGNAMIC d.o.o.'
        },
        servers: ["http://localhost:5600"]
      },
    },
    apis: ["./routes/*.js"]
  };

  const swaggerDocs = swaggerJsDoc(swaggerOptions);
  console.log(JSON.stringify(swaggerDocs, null, 2));
  
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
  
  app.use(cors());
  
  app.use("/", businessUsers);
  app.use("/", events);
  app.use("/", tickets);
  app.use("/", contact);
  app.use("/", documents);
  
  app.listen(5600);
  