import { Link } from 'react-router-dom'
import { BusProfileForm } from '../components/BusProfileForm'
import { useBusProfile } from '../contexts/BusProfileContext'
import { strings } from '../strings'

export function SettingsPage() {
  const { profile, saveProfile } = useBusProfile()
  if (!profile) return null

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Settings</p>
          <h1 id="settings-title">{strings.settings}</h1>
        </div>
        <Link className="quiet-link" to="/">{strings.close}</Link>
      </div>
      <p className="settings-help">{strings.settingsHelp}</p>
      <BusProfileForm
        initialValue={{ registrationNumber: profile.registration_number, ownerName: profile.owner_name ?? '', phoneNumber: profile.phone_number ?? '', name: profile.name ?? '', route: profile.route ?? '' }}
        onSave={saveProfile}
        submitLabel={strings.saveChanges}
      />
    </section>
  )
}
