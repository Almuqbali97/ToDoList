import express from 'express'; // importing express frame work
import bodyParser from 'body-parser'; // importing body parser to handle forms submtions
import mongoose from 'mongoose';
import _ from 'lodash';
import * as dotenv from 'dotenv';
dotenv.config();

const app = express(); // using express frame work for the backend
const port = process.env.PORT; // the port that will be used
// const toDoListDBUrl = "mongodb://localhost:27017/toDoListDB-test"; //db nmae (toDoListDB-test)\\ local connection
const toDoListDBUrl = process.env.MONGO_CONNECT_URL;
   
// using static middle where to access the style sheet in the puclic folder
app.use(express.static('./public'));
// using the body parser
app.use(bodyParser.urlencoded({ extended: true }));


//connection to the db
try {
    await mongoose.connect(toDoListDBUrl,{family:4});
     console.log("Connected to the db server secssfully");
 } catch (error) {
     console.log(error);    
 }
 
 
// creating schema to for our db collection
const toDoListSchema = new mongoose.Schema({
    toDoItem: {
        type:String,
        required:[true, "No to do item entred"]
    },
    // checkedItem:Boolean // to store items has been accomplished
});

//creating the data model mongoose.model("db Collection name", "schema") in our database the collection will be item stoDoListDB-test
const Item = mongoose.model("items",toDoListSchema); // i added this line so each user has his own data collection

// creating the schema for the coustom lists menue,
const customListSchema = new mongoose.Schema({
    name: String, // so we have list name to be stored in the db and check if it exists when the user request it
    items:[toDoListSchema], // the items stored in the custome list will be formate in the same schema of the default list
    // try to understand why we used the prvious list schema
});

// now creating the model for the custom lists
const lists = mongoose.model("customLists",customListSchema);


// routing the pages
app.get('/', async (req,res) => {

    const itemName = await Item.find({}); // reading all the data in the database
    // console.log(itemName);
    res.render('index.ejs',{
    dateToday: dateToday(),
    listTitle: "Main List",
    ToDoItems: itemName // sending all the database results to the ejs
    });

});

// this following code will handle the form posts and to add the items to the page
app.post('/add-item', async (req,res) => {
    // console.log(req.body.submitButton);
    const currentListDirection = _.upperFirst(req.body.submitButton);// this also means the list title

    const addNewItem = new Item ({
        toDoItem:req.body.newItem
    });
    // so this if stament will help putting the new item in the right list
    if (currentListDirection === 'Main List') {
        Item.insertMany([addNewItem]);
        // now we read the data from our dbs in the home page
        // since we only ssaving one item at a time, we coul also say Item.save(), but i prefer insertMany, for consistency
        res.redirect('/'); 
    } else {
        // when we are not in the main list collection, we need to find the list we are in
        // and add the item into it
        const findAndAddToThCusomeList = await lists.findOne({name:currentListDirection});
        findAndAddToThCusomeList.items.push(addNewItem); // we push the new added item to the list of items on the current list
        findAndAddToThCusomeList.save();
        res.redirect('/' + currentListDirection ); 
    }

});

// deleting item rount
app.post('/delete-item', async (req,res) => {
    // console.log(req.body.checkbox);
    const checkedItemID = req.body.checkbox; // from the ejs we get the checked item id
    const listName = req.body.listName;
    console.log(listName);
    // now we need to remove the item form the list, we can use this method in mongoose
    if (listName === 'Main List') {
        await Item.findByIdAndRemove(checkedItemID)
        res.redirect('/');
    } else {
        // the direct way to remove item from an aray is using the $pull method from mongoDb
        // according to chatGBT  we can use it this way
        try {
            // you can chek mongoDB query for understanding this batter
            // list name is the fillter here that will be checked, &pull is to pull out the items with id fillter
            await lists.updateOne({name: listName },{ $pull:{ items:{_id:checkedItemID}}});
            console.log('Item removed successfully');
          } catch (err) {
            console.error('Error:', err);
          }
          
        res.redirect('/'+listName);
    }
   
});


// lets creat a dynami routing for lists, example, /home /work ... hopies .. etc
// the aim of this routing is to make a new list of user choice and creats a new to do list for it, by using the schema we made before
app.get('/:customListName', async (req,res) => {
    // console.log(req.params.customListName);
    // we can also use lodash to insure the first letter is always capterl
    const customListName = _.upperFirst(req.params.customListName);
    // before creating and saving the new list we need to check if the user has already a list with that name to display it,
    //otherwise creat new one
    // lets first read the data base to see what custom lists we have
  
    const existingCustomeLists = await lists.findOne({name : customListName});// we used the custome route as a filter
    
    if((existingCustomeLists)) {
        // console.log("We have this list already");
        res.render('index.ejs',{
            dateToday: dateToday(),
            listTitle:customListName,
            ToDoItems:existingCustomeLists.items // see the database to understand more
            });
    }  else {
    // now lets use model we created above
        const newList = new lists({
        name : customListName,
        // items : {toDoItem: "random task to do"}
    });
    
    // saving the added items useing
        newList.save();       
        res.redirect('/' + customListName); // so we go back to the new created list
    }
    
})
// initilizing the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


// this fucntion is returing the current date
function dateToday() {
    // getting the date today using Date objext
    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wensday', 'Thursday', 'Friday','Satarday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = new Date(); // this object will get us the date today in this format "Sat Aug 12 2023 12:03:05 GMT+0400 (Gulf Standard Time)"
    const currentMonth = months[date.getMonth()];
    const currentMonthDay = date.getDate();
    const currentWeekday = weekDays[date.getDay()];
    const currenYear = date.getFullYear();
    const currentDate = currentWeekday +', '+ currentMonth + ' ' + currentMonthDay + ', ' + currenYear; 
    return currentDate;
};
