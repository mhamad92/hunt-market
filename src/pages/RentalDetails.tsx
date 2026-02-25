// src/pages/RentalDetails.tsx

import React, { useMemo, useState, useCallback } from "react";
import { IonContent, IonModal, IonPage, IonToast } from "@ionic/react";
import { useHistory, useParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { RENTALS, Rental } from "../data/rentals";

// Swiper (pinch + double tap zoom)
import { Swiper, SwiperSlide } from "swiper/react";
import { Zoom, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/zoom";
import "swiper/css/pagination";

type RouteParams = { rentalId: string };

const pad2 = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const isSameDay = (a: Date, b: Date) => toKey(a) === toKey(b);

const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const monthLabel = (d: Date) =>
  d.toLocaleString(undefined, { month: "long", year: "numeric" });

function expandBlockedDates(r: Rental): Set<string> {
  const out = new Set<string>();

  (r.blockedDates || []).forEach((k) => out.add(k));

  (r.blockedRanges || []).forEach((rng) => {
    const s = startOfDay(new Date(rng.start));
    const e = startOfDay(new Date(rng.end));
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return;

    let cur = s;
    while (cur.getTime() <= e.getTime()) {
      out.add(toKey(cur));
      cur = addDays(cur, 1);
    }
  });

  return out;
}

function buildMonthGrid(monthStart: Date) {
  const start = startOfMonth(monthStart);
  const end = endOfMonth(monthStart);

  const firstDow = start.getDay(); // 0 Sun ... 6 Sat
  const daysInMonth = end.getDate();

  const cells: Array<{ date: Date | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ date: null });

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(monthStart.getFullYear(), monthStart.getMonth(), day) });
  }

  while (cells.length % 7 !== 0) cells.push({ date: null });
  return cells;
}

function nightsBetween(a: Date, b: Date) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  const nights = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return Math.max(0, nights);
}

const RentalDetails: React.FC = () => {
  const history = useHistory();
  const { rentalId } = useParams<RouteParams>();

  const rental = useMemo(() => RENTALS.find((x) => x.id === rentalId), [rentalId]);

  const [toast, setToast] = useState<string>("");
  const [showGallery, setShowGallery] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  // Calendar selection
  const today = useMemo(() => startOfDay(new Date()), []);
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const goPrevMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const goNextMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const monthCells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const unavailable = useMemo(() => {
    if (!rental) return new Set<string>();
    return expandBlockedDates(rental);
  }, [rental]);

  const isDisabled = useCallback(
    (d: Date) => {
      const k = toKey(d);
      if (d.getTime() < today.getTime()) return true; // past
      if (unavailable.has(k)) return true; // blocked from rental data
      return false;
    },
    [today, unavailable]
  );

  const inRange = useCallback(
    (d: Date) => {
      if (!checkIn || !checkOut) return false;
      const t = startOfDay(d).getTime();
      return t > startOfDay(checkIn).getTime() && t < startOfDay(checkOut).getTime();
    },
    [checkIn, checkOut]
  );

  const rangeHasBlocked = useCallback(
    (a: Date, b: Date) => {
      let cur = startOfDay(a);
      const end = startOfDay(b);
      while (cur.getTime() <= end.getTime()) {
        const k = toKey(cur);
        // allow endpoints check? no — blocked anywhere should fail
        if (unavailable.has(k)) return true;
        cur = addDays(cur, 1);
      }
      return false;
    },
    [unavailable]
  );

  const selectDay = (d: Date) => {
    if (isDisabled(d)) return;

    // start selection
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(d);
      setCheckOut(null);
      return;
    }

    // choose checkout
    if (checkIn) {
      const a = startOfDay(checkIn);
      const b = startOfDay(d);

      if (b.getTime() <= a.getTime()) {
        setToast("Check-out must be after check-in.");
        return;
      }

      // block ranges that cross unavailable days
      if (rangeHasBlocked(a, b)) {
        setToast("That range includes unavailable dates. Choose different days.");
        return;
      }

      setCheckOut(d);
    }
  };

  if (!rental) {
    return (
      <IonPage>
        <AppHeader showBack backHref="/rentals" />
        <IonContent className="hm-content hm-camo">
          <div className="hm-wrap" style={{ paddingTop: 18 }}>
            <div style={{ color: "rgba(238,243,238,0.85)", fontWeight: 1000 }}>
              Rental not found.
            </div>
            <button
              className="pd-primary"
              style={{ marginTop: 12 }}
              onClick={() => history.push("/rentals")}
              type="button"
            >
              Back to Rentals
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const total = nights ? nights * rental.pricePerDay : 0;

  return (
    <IonPage>
      <AppHeader showBack backHref="/rentals" />

      <IonContent className="hm-content hm-camo">
        <div className="hm-wrap" style={{ paddingTop: 14, paddingBottom: 26 }}>
          {/* HERO */}
          <div className="rd-hero">
            <button
              className="rd-hero-img"
              type="button"
              onClick={() => {
                setActiveImg(0);
                setShowGallery(true);
              }}
              style={{ backgroundImage: `url(${rental.image})` }}
              aria-label="Open gallery"
            >
              <div className="rd-hero-overlay" />
              <div className="rd-hero-top">
                <div className="rd-type">{rental.type === "cabin" ? "Cabin" : "Land"}</div>
                <div className="rd-price">
                  ${rental.pricePerDay}
                  <span>/day</span>
                </div>
              </div>

              <div className="rd-hero-bottom">
                <div className="rd-title">{rental.title}</div>
                <div className="rd-sub">
                  {rental.region}
                  {rental.capacity ? ` • Up to ${rental.capacity}` : ""}
                  {rental.size ? ` • ${rental.size}` : ""}
                </div>
              </div>
            </button>

            {/* Mini thumbs */}
            <div className="rd-thumbs">
              {rental.images.slice(0, 4).map((img, i) => (
                <button
                  key={img}
                  className={`rd-thumb ${i === 0 ? "active" : ""}`}
                  style={{ backgroundImage: `url(${img})` }}
                  type="button"
                  onClick={() => {
                    setActiveImg(i);
                    setShowGallery(true);
                  }}
                  aria-label={`Open image ${i + 1}`}
                />
              ))}
              <button
                className="rd-thumb rd-thumb-more"
                type="button"
                onClick={() => {
                  setActiveImg(0);
                  setShowGallery(true);
                }}
              >
                View photos
              </button>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="rd-card">
            <div className="rd-h">About this place</div>
            <div className="rd-p">{rental.description}</div>
          </div>

          {/* AVAILABILITY CALENDAR */}
          <div className="rd-card">
            <div className="rd-h">Availability</div>

            <div className="rd-cal">
              <div className="rd-cal-top">
                <div className="rd-cal-box">
                  <div className="rd-cal-k">Check-in</div>
                  <div className="rd-cal-v">{checkIn ? toKey(checkIn) : "Select"}</div>
                </div>
                <div className="rd-cal-box">
                  <div className="rd-cal-k">Check-out</div>
                  <div className="rd-cal-v">{checkOut ? toKey(checkOut) : "Select"}</div>
                </div>
                <button
                  className="rd-cal-clear"
                  type="button"
                  onClick={() => {
                    setCheckIn(null);
                    setCheckOut(null);
                  }}
                >
                  Clear
                </button>
              </div>

              <div className="rd-cal-monthbar">
                <button className="rd-cal-nav" onClick={goPrevMonth} type="button" aria-label="Previous month">
                  ‹
                </button>
                <div className="rd-cal-month">{monthLabel(viewMonth)}</div>
                <button className="rd-cal-nav" onClick={goNextMonth} type="button" aria-label="Next month">
                  ›
                </button>
              </div>

              <div className="rd-cal-weekdays">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
                  <div key={w} className="rd-cal-wd">
                    {w}
                  </div>
                ))}
              </div>

              <div className="rd-cal-grid">
                {monthCells.map((cell, idx) => {
                  const d = cell.date;
                  if (!d) return <div key={`e-${idx}`} className="rd-day empty" />;

                  const disabled = isDisabled(d);
                  const selectedStart = checkIn && isSameDay(d, checkIn);
                  const selectedEnd = checkOut && isSameDay(d, checkOut);
                  const mid = inRange(d);
                  const dot = unavailable.has(toKey(d));

                  return (
                    <button
                      key={toKey(d)}
                      className={[
                        "rd-day",
                        disabled ? "disabled" : "",
                        selectedStart ? "start" : "",
                        selectedEnd ? "end" : "",
                        mid ? "mid" : "",
                      ].join(" ")}
                      type="button"
                      onClick={() => selectDay(d)}
                      aria-label={`Select ${toKey(d)}`}
                    >
                      <div className="rd-day-num">{d.getDate()}</div>
                      {dot ? <div className="rd-day-dot" /> : null}
                    </button>
                  );
                })}
              </div>

              <div className="rd-cal-note">• Dots are unavailable • Pick check-in then check-out</div>
            </div>
          </div>

          <div style={{ height: 90 }} />
        </div>

        {/* Sticky bottom bar like Airbnb */}
        <div className="rd-sticky">
          <div className="rd-sticky-inner">
            <div className="rd-sticky-left">
              <div className="rd-sticky-price">
                ${rental.pricePerDay}
                <span>/day</span>
              </div>
              <div className="rd-sticky-sub">
                {checkIn && checkOut ? (
                  <>
                    {nights} night{nights === 1 ? "" : "s"} • Total ${total.toFixed(2)}
                  </>
                ) : (
                  <>Select dates to see total</>
                )}
              </div>
            </div>

            <div className="rd-sticky-actions">
              <button
                className="rd-sticky-contact"
                type="button"
                onClick={() => setToast("Contact host: connect WhatsApp/Call later.")}
              >
                Contact
              </button>
              <button
                className="rd-sticky-book"
                type="button"
                onClick={() => {
                  if (!checkIn || !checkOut) return setToast("Select check-in and check-out first.");
                  setToast("Requested booking (demo). Next: send to store/owner.");
                }}
              >
                Reserve
              </button>
            </div>
          </div>
        </div>

        {/* Gallery modal (pinch + double tap zoom via Swiper Zoom) */}
        <IonModal
          isOpen={showGallery}
          onDidDismiss={() => setShowGallery(false)}
          className="hm-image-modal"
        >
          <div className="hm-image-modal-content">
            <button className="hm-image-close" onClick={() => setShowGallery(false)} type="button">
              ✕
            </button>

            <Swiper
              className="hm-swiper"
              modules={[Zoom, Pagination]}
              zoom={true}
              pagination={{ clickable: true }}
              initialSlide={activeImg}
              onSlideChange={(s) => setActiveImg(s.activeIndex)}
            >
              {rental.images.map((img) => (
                <SwiperSlide key={img}>
                  <div className="swiper-zoom-container">
                    <img src={img} alt="Rental" />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            <div className="rd-zoomhint">Pinch / double-tap to zoom</div>
          </div>
        </IonModal>

        <IonToast
          isOpen={!!toast}
          message={toast}
          duration={1600}
          onDidDismiss={() => setToast("")}
        />
      </IonContent>
    </IonPage>
  );
};

export default RentalDetails;