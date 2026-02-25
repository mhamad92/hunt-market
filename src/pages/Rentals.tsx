import React, { useMemo, useState } from "react";
import { IonPage, IonContent, IonSearchbar, IonSelect, IonSelectOption } from "@ionic/react";
import { useHistory } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { RENTALS } from "../data/rentals";

const Rentals: React.FC = () => {
  const history = useHistory();

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "land" | "cabin">("all");
  const [regionFilter, setRegionFilter] = useState("all");

  const regions = useMemo(
    () => Array.from(new Set(RENTALS.map((r) => r.region))),
    []
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = [...RENTALS];

    if (term)
      list = list.filter((r) =>
        `${r.title} ${r.region}`.toLowerCase().includes(term)
      );

    if (typeFilter !== "all") list = list.filter((r) => r.type === typeFilter);
    if (regionFilter !== "all") list = list.filter((r) => r.region === regionFilter);

    return list;
  }, [q, typeFilter, regionFilter]);

  return (
    <IonPage>
      <AppHeader showBack backHref="/home" />

      <IonContent fullscreen className="hm-content hm-camo">
        <div className="hm-wrap" style={{ paddingTop: 18 }}>
          <div className="hm-hero-title">
            HUNTING <span>RENTALS</span>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <IonSearchbar
              className="hm-search"
              value={q}
              placeholder="Search lands or cabins..."
              onIonInput={(e) => setQ(e.detail.value ?? "")}
            />

            <IonSelect
              value={typeFilter}
              interface="popover"
              className="hm-select-ionic"
              onIonChange={(e) => setTypeFilter(e.detail.value)}
            >
              <IonSelectOption value="all">Type: All</IonSelectOption>
              <IonSelectOption value="land">Land</IonSelectOption>
              <IonSelectOption value="cabin">Cabin</IonSelectOption>
            </IonSelect>

            <IonSelect
              value={regionFilter}
              interface="popover"
              className="hm-select-ionic"
              onIonChange={(e) => setRegionFilter(e.detail.value)}
            >
              <IonSelectOption value="all">Region: All</IonSelectOption>
              {regions.map((r) => (
                <IonSelectOption key={r} value={r}>
                  {r}
                </IonSelectOption>
              ))}
            </IonSelect>
          </div>

          <div className="hm-grid" style={{ marginTop: 20 }}>
            {filtered.map((r) => (
              <div
                key={r.id}
                className="hm-product"
                role="button"
                onClick={() => history.push(`/rental/${r.id}`)}
              >
                <div
                  className="hm-product-img"
                  style={{ backgroundImage: `url(${r.image})` }}
                />

                <div className="hm-product-body">
                  <p className="hm-product-name">{r.title}</p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="hm-product-price">${r.pricePerDay}/day</div>
                    <span className="sd-pill">{r.type.toUpperCase()}</span>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
                    {r.region}
                    {r.size && ` • ${r.size}`}
                    {r.capacity && ` • ${r.capacity} hunters`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!filtered.length && (
            <div style={{ marginTop: 24, opacity: 0.7 }}>
              No rentals found.
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Rentals;