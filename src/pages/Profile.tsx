import React, { useEffect, useMemo, useState } from "react";
import { IonContent, IonPage, IonToast } from "@ionic/react";
import { useHistory } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { notifyCartUpdated } from "../utils/cartBus";
import { logoutLocalUser, changeLocalPassword } from "../utils/authLocal";

type ProfileData = {
  fullName: string;
  phone: string;
  email: string;
};

type Address = {
  id: string;
  label: string; // Home, Work...
  city: string;
  area: string;
  street: string;
  building?: string;
  floor?: string;
  notes?: string;
  isDefault?: boolean;
};

const PROFILE_KEY = "hm_profile";
const ADDR_KEY = "hm_addresses";
const LOGGED_KEY = "hm_logged_in";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function readProfile(): ProfileData {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { fullName: "", phone: "", email: "" };
    const p = JSON.parse(raw) as Partial<ProfileData>;
    return {
      fullName: p.fullName ?? "",
      phone: p.phone ?? "",
      email: p.email ?? "",
    };
  } catch {
    return { fullName: "", phone: "", email: "" };
  }
}

function writeProfile(p: ProfileData) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

function readAddresses(): Address[] {
  try {
    const raw = localStorage.getItem(ADDR_KEY);
    return raw ? (JSON.parse(raw) as Address[]) : [];
  } catch {
    return [];
  }
}

function writeAddresses(list: Address[]) {
  localStorage.setItem(ADDR_KEY, JSON.stringify(list));
}

const Profile: React.FC = () => {
  const history = useHistory();

  const [toast, setToast] = useState<string>("");

  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem(LOGGED_KEY) === "1"
  );

  // Profile + Addresses state
  const [profile, setProfile] = useState<ProfileData>(() => readProfile());
  const [addresses, setAddresses] = useState<Address[]>(() => readAddresses());

  // Address editor
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(
    () => addresses.find((a) => a.id === editingId) || null,
    [addresses, editingId]
  );

  const [addrForm, setAddrForm] = useState<Address>(() => ({
    id: "",
    label: "Home",
    city: "",
    area: "",
    street: "",
    building: "",
    floor: "",
    notes: "",
    isDefault: false,
  }));

  const onChangePassword = () => {
  if (!pwCurrent || !pwNew || !pwNew2) return setToast("Fill all password fields.");
  if (pwNew !== pwNew2) return setToast("New passwords do not match.");

  try {
    changeLocalPassword(pwCurrent, pwNew);
    setPwCurrent("");
    setPwNew("");
    setPwNew2("");
    setToast("Password updated.");
  } catch (e: any) {
    setToast(e?.message || "Could not update password.");
  }
};

  useEffect(() => {
    // keep in sync if user logs in/out in other pages
    const onFocus = () => setIsLoggedIn(localStorage.getItem(LOGGED_KEY) === "1");
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
  setProfile(readProfile());
  setAddresses(readAddresses());
}, [isLoggedIn]);

  // When opening editor
  useEffect(() => {
    if (!editing) return;
    setAddrForm({
      id: editing.id,
      label: editing.label ?? "Home",
      city: editing.city ?? "",
      area: editing.area ?? "",
      street: editing.street ?? "",
      building: editing.building ?? "",
      floor: editing.floor ?? "",
      notes: editing.notes ?? "",
      isDefault: !!editing.isDefault,
    });
  }, [editing]);

  const saveProfile = () => {
    if (!profile.fullName.trim()) return setToast("Full name is required.");
    if (!profile.phone.trim()) return setToast("Phone number is required.");

    writeProfile(profile);
    setToast("Profile saved.");
  };

  const openNewAddress = () => {
    setEditingId("NEW");
    setAddrForm({
      id: "",
      label: "Home",
      city: "",
      area: "",
      street: "",
      building: "",
      floor: "",
      notes: "",
      isDefault: addresses.length === 0, // first one default
    });
  };

  const cancelAddressEdit = () => {
    setEditingId(null);
    setAddrForm({
      id: "",
      label: "Home",
      city: "",
      area: "",
      street: "",
      building: "",
      floor: "",
      notes: "",
      isDefault: false,
    });
  };

  const setDefaultAddress = (id: string) => {
    const next = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    setAddresses(next);
    writeAddresses(next);
    setToast("Default address updated.");
  };

  const deleteAddress = (id: string) => {
    const next = addresses.filter((a) => a.id !== id);
    // ensure at least one default if list not empty
    if (next.length && !next.some((a) => a.isDefault)) next[0].isDefault = true;

    setAddresses(next);
    writeAddresses(next);
    setToast("Address removed.");
  };

  const saveAddress = () => {
    if (!addrForm.city.trim() || !addrForm.area.trim() || !addrForm.street.trim()) {
      return setToast("City, Area, and Street are required.");
    }

    const isNew = editingId === "NEW" || !addrForm.id;
    const id = isNew ? uid() : addrForm.id;

    let next = [...addresses];

    const payload: Address = {
      ...addrForm,
      id,
      label: addrForm.label?.trim() || "Home",
      city: addrForm.city.trim(),
      area: addrForm.area.trim(),
      street: addrForm.street.trim(),
      building: (addrForm.building ?? "").trim(),
      floor: (addrForm.floor ?? "").trim(),
      notes: (addrForm.notes ?? "").trim(),
      isDefault: !!addrForm.isDefault,
    };

    if (payload.isDefault) {
      next = next.map((a) => ({ ...a, isDefault: false }));
    }

    if (isNew) next.unshift(payload);
    else next = next.map((a) => (a.id === id ? payload : a));

    if (next.length && !next.some((a) => a.isDefault)) next[0].isDefault = true;

    setAddresses(next);
    writeAddresses(next);
    setToast(isNew ? "Address added." : "Address updated.");
    cancelAddressEdit();
  };

  const logout = () => {
  logoutLocalUser();
  setIsLoggedIn(false);
  notifyCartUpdated();
  setToast("Logged out.");
};

  const defaultAddr = useMemo(
    () => addresses.find((a) => a.isDefault) || null,
    [addresses]
  );

  return (
  <IonPage>
    <AppHeader />

    <IonContent fullscreen className="hm-content hm-camo">
      <div className="hm-wrap" style={{ paddingTop: 14, paddingBottom: 26 }}>
        {!isLoggedIn ? (
          <div className="hm-auth-card" style={{ maxWidth: 560, margin: "0 auto" }}>
            <div style={{ fontWeight: 1000, fontSize: 20 }}>Welcome</div>
            <div style={{ opacity: 0.8, marginTop: 8, lineHeight: 1.5 }}>
              Log in to checkout orders and request bookings.
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <button className="pd-primary" onClick={() => history.push("/login")} type="button">
                Log in
              </button>
              <button className="pd-secondary" onClick={() => history.push("/register")} type="button">
                Create account
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Profile Card */}
            <div className="hm-auth-card" style={{ maxWidth: 960, margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 1100, fontSize: 20 }}>Your Profile</div>
                  <div style={{ opacity: 0.75, marginTop: 4 }}>
                    Saved locally for faster checkout.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="pd-secondary" onClick={() => history.push("/home")} type="button">
                    Continue shopping
                  </button>
                  <button className="pd-secondary" onClick={logout} type="button">
                    Log out
                  </button>
                </div>
              </div>

              <div className="profile-grid" style={{ marginTop: 14 }}>
                <div className="profile-field">
                  <div className="profile-label">Full name</div>
                  <input
                    className="profile-input"
                    value={profile.fullName}
                    onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="Mohamad Houmani"
                  />
                </div>

                <div className="profile-field">
                  <div className="profile-label">Phone</div>
                  <input
                    className="profile-input"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+961 ..."
                    inputMode="tel"
                  />
                </div>

                <div className="profile-field">
                  <div className="profile-label">Email (optional)</div>
                  <input
                    className="profile-input"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    placeholder="name@email.com"
                    inputMode="email"
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <button className="pd-primary" onClick={saveProfile} type="button">
                  Save profile
                </button>
              </div>
            </div>

            {/* Addresses */}
            <div className="hm-auth-card" style={{ maxWidth: 960, margin: "14px auto 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 1100, fontSize: 20 }}>Addresses</div>
                  <div style={{ opacity: 0.75, marginTop: 4 }}>
                    Default address will be used in Checkout.
                  </div>
                </div>

                <button
                  className={editingId ? "pd-secondary" : "pd-primary"}
                  type="button"
                  onClick={() => {
                    if (editingId) cancelAddressEdit();
                    else openNewAddress();
                  }}
                >
                  {editingId ? "Close" : "+ Add address"}
                </button>
              </div>

              {defaultAddr && (
                <div className="profile-default" style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 1000 }}>Default</div>
                  <div style={{ opacity: 0.85, marginTop: 4 }}>
                    {defaultAddr.label} • {defaultAddr.city}, {defaultAddr.area}, {defaultAddr.street}
                    {defaultAddr.building ? `, ${defaultAddr.building}` : ""}
                    {defaultAddr.floor ? `, Floor ${defaultAddr.floor}` : ""}
                  </div>
                </div>
              )}

              <div className="addr-list" style={{ marginTop: 12 }}>
                {addresses.length === 0 ? (
                  <div style={{ opacity: 0.75 }}>No saved addresses yet.</div>
                ) : (
                  addresses.map((a) => (
                    <div key={a.id} className="addr-card">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 1000 }}>
                            {a.label} {a.isDefault ? <span className="addr-pill">Default</span> : null}
                          </div>
                          <div style={{ opacity: 0.85, marginTop: 4, lineHeight: 1.4 }}>
                            {a.city}, {a.area}, {a.street}
                            {a.building ? `, ${a.building}` : ""}
                            {a.floor ? `, Floor ${a.floor}` : ""}
                          </div>
                          {a.notes ? <div style={{ opacity: 0.65, marginTop: 6 }}>{a.notes}</div> : null}
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {!a.isDefault ? (
                            <button className="pd-secondary" onClick={() => setDefaultAddress(a.id)} type="button">
                              Set default
                            </button>
                          ) : null}
                          <button className="pd-secondary" onClick={() => setEditingId(a.id)} type="button">
                            Edit
                          </button>
                          <button className="pd-secondary" onClick={() => deleteAddress(a.id)} type="button">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Inline editor (dropdown inside Addresses card) */}
              <div className={`hm-collapse addr ${editingId ? "open" : ""}`}>
                {editingId && (
                  <div className="addr-editor" style={{ marginTop: 14 }}>
                    <div style={{ fontWeight: 1100, fontSize: 18 }}>
                      {editingId === "NEW" ? "Add address" : "Edit address"}
                    </div>

                    <div className="addr-grid" style={{ marginTop: 12 }}>
                      <div className="profile-field">
                        <div className="profile-label">Label</div>
                        <input
                          className="profile-input"
                          value={addrForm.label}
                          onChange={(e) => setAddrForm((a) => ({ ...a, label: e.target.value }))}
                          placeholder="Home / Work"
                        />
                      </div>

                      <div className="profile-field">
                        <div className="profile-label">City</div>
                        <input
                          className="profile-input"
                          value={addrForm.city}
                          onChange={(e) => setAddrForm((a) => ({ ...a, city: e.target.value }))}
                          placeholder="Enter City"
                        />
                      </div>

                      <div className="profile-field">
                        <div className="profile-label">Area</div>
                        <input
                          className="profile-input"
                          value={addrForm.area}
                          onChange={(e) => setAddrForm((a) => ({ ...a, area: e.target.value }))}
                          placeholder="Enter Area"
                        />
                      </div>

                      <div className="profile-field" style={{ gridColumn: "1 / -1" }}>
                        <div className="profile-label">Street</div>
                        <input
                          className="profile-input"
                          value={addrForm.street}
                          onChange={(e) => setAddrForm((a) => ({ ...a, street: e.target.value }))}
                          placeholder="Street name + number"
                        />
                      </div>

                      <div className="profile-field">
                        <div className="profile-label">Building</div>
                        <input
                          className="profile-input"
                          value={addrForm.building ?? ""}
                          onChange={(e) => setAddrForm((a) => ({ ...a, building: e.target.value }))}
                          placeholder="Building name"
                        />
                      </div>

                      <div className="profile-field">
                        <div className="profile-label">Floor</div>
                        <input
                          className="profile-input"
                          value={addrForm.floor ?? ""}
                          onChange={(e) => setAddrForm((a) => ({ ...a, floor: e.target.value }))}
                          placeholder=""
                        />
                      </div>

                      <div className="profile-field" style={{ gridColumn: "1 / -1" }}>
                        <div className="profile-label">Notes (optional)</div>
                        <input
                          className="profile-input"
                          value={addrForm.notes ?? ""}
                          onChange={(e) => setAddrForm((a) => ({ ...a, notes: e.target.value }))}
                          placeholder=""
                        />
                      </div>

                      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <label className="addr-check">
                          <input
                            type="checkbox"
                            checked={!!addrForm.isDefault}
                            onChange={(e) => setAddrForm((a) => ({ ...a, isDefault: e.target.checked }))}
                          />
                          <span>Set as default</span>
                        </label>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                      <button className="pd-primary" onClick={saveAddress} type="button">
                        Save address
                      </button>
                      <button className="pd-secondary" onClick={cancelAddressEdit} type="button">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Security */}
            <div className="hm-auth-card" style={{ maxWidth: 960, margin: "14px auto 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 1100, fontSize: 20 }}>Security</div>
                  <div style={{ opacity: 0.75, marginTop: 4 }}>
                    Manage your password (saved locally for now).
                  </div>
                </div>

                <button
                  className={showPw ? "pd-secondary" : "pd-primary"}
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? "Close" : "Change password"}
                </button>
              </div>

              <div className={`hm-collapse pw ${showPw ? "open" : ""}`}>
                <div className="addr-grid" style={{ marginTop: 12 }}>
                  <div className="profile-field">
                    <div className="profile-label">Current password</div>
                    <input
                      className="profile-input"
                      type="password"
                      value={pwCurrent}
                      onChange={(e) => setPwCurrent(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="profile-field">
                    <div className="profile-label">New password</div>
                    <input
                      className="profile-input"
                      type="password"
                      value={pwNew}
                      onChange={(e) => setPwNew(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>

                  <div className="profile-field">
                    <div className="profile-label">Confirm new password</div>
                    <input
                      className="profile-input"
                      type="password"
                      value={pwNew2}
                      onChange={(e) => setPwNew2(e.target.value)}
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="pd-primary" onClick={onChangePassword} type="button">
                    Update password
                  </button>
                  <button
                    className="pd-secondary"
                    onClick={() => {
                      setPwCurrent("");
                      setPwNew("");
                      setPwNew2("");
                      setShowPw(false);
                    }}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <IonToast
        isOpen={!!toast}
        message={toast}
        duration={1400}
        onDidDismiss={() => setToast("")}
      />
    </IonContent>
  </IonPage>
);
};
export default Profile;