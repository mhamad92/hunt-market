import React ,{useEffect} from "react";
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Redirect, Route } from "react-router-dom";
import { homeOutline, businessOutline, mapOutline, personOutline } from "ionicons/icons";
import { giftOutline } from "ionicons/icons";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRaffle from "./pages/AdminRaffle";
import { setupPushNotifications } from "./push";
import { auth } from "./firebase";



import "./theme/variables.css";

/* Tab pages */
import Home from "./pages/Home";
import Stores from "./pages/Stores";
import Rentals from "./pages/Rentals";
import Profile from "./pages/Profile";

/* Stack pages */
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Category from "./pages/Category";
import ProductDetails from "./pages/ProductDetails";
import StoreDetails from "./pages/StoreDetails";
import RentalDetails from "./pages/RentalDetails";

/* Raffles */
import Raffles from "./pages/Raffles";
import RaffleDetails from "./pages/RaffleDetails";

/* Core CSS */
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";



setupIonicReact();



const App: React.FC = () => {

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (u) {
        await setupPushNotifications();
      }
    });

    return () => unsub();
  }, []);

  return (
  <IonApp>

    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          {/* Tabs */}
          <Route exact path="/home" component={Home} />
          <Route exact path="/stores" component={Stores} />
          <Route exact path="/rentals" component={Rentals} />
          <Route exact path="/profile" component={Profile} />

          {/* Stack pages */}
          <Route exact path="/cart" component={Cart} />
          <Route exact path="/checkout" component={Checkout} />
          <Route exact path="/login" component={Login} />
          <Route exact path="/register" component={Register} />
          <Route exact path="/category/:categoryId" component={Category} />
          <Route exact path="/product/:productId" component={ProductDetails} />
          <Route exact path="/store/:storeId" component={StoreDetails} />
          <Route exact path="/rental/:rentalId" component={RentalDetails} />
          <Route exact path="/admin" component={AdminDashboard} />
          <Route exact path="/admin/raffles/:raffleId" component={AdminRaffle} />

          {/* Raffles (stack, not a tab) */}
          <Route exact path="/raffles" component={Raffles} />
          <Route exact path="/raffles/:raffleId" component={RaffleDetails} />

          {/* Default */}
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>

          {/* Fallback */}
          <Route>
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>

        <IonTabBar slot="bottom">
          <IonTabButton tab="home" href="/home">
            <IonIcon icon={homeOutline} />
            <IonLabel>Home</IonLabel>
          </IonTabButton>

          <IonTabButton tab="stores" href="/stores">
            <IonIcon icon={businessOutline} />
            <IonLabel>Stores</IonLabel>
          </IonTabButton>

          <IonTabButton tab="rentals" href="/rentals">
            <IonIcon icon={mapOutline} />
            <IonLabel>Rentals</IonLabel>
          </IonTabButton>

           <IonTabButton tab="raffles" href="/raffles">
          <IonIcon icon={giftOutline} />
          <IonLabel>Raffles</IonLabel>
        </IonTabButton>


          <IonTabButton tab="profile" href="/profile">
            <IonIcon icon={personOutline} />
            <IonLabel>Profile</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  </IonApp>
);
};

export default App;