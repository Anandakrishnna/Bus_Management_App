import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BusProfileForm } from '../components/BusProfileForm'
import { useBusProfile } from '../contexts/BusProfileContext'
import { strings } from '../strings'

export function SetupPage() {
  const { saveProfile } = useBusProfile()
  const { user } = useAuth()
  const navigate = useNavigate()

  async function saveAndContinue(input: Parameters<typeof saveProfile>[0]) {
    const error = await saveProfile(input)
    if (!error) navigate('/', { replace: true })
    return error
  }

  return (
    <main className="setup-page">
      <section className="setup-card" aria-labelledby="setup-title">
        <p className="wordmark wordmark--auth">{strings.appName}</p>
        <p className="eyebrow">One bus setup</p>
        <h1 id="setup-title">{strings.setupTitle}</h1>
        <p className="auth-help">{strings.setupHelp}</p>
        <BusProfileForm
          initialValue={{
            registrationNumber: '',
            ownerName: typeof user?.user_metadata?.owner_name === 'string' ? user.user_metadata.owner_name : '',
            phoneNumber: typeof user?.user_metadata?.phone_number === 'string' ? user.user_metadata.phone_number : '',
            name: typeof user?.user_metadata?.vehicle_name === 'string' ? user.user_metadata.vehicle_name : '',
            route: '',
          }}
          onSave={saveAndContinue}
          requireContactDetails
          submitLabel={strings.saveAndContinue}
        />
      </section>
    </main>
  )
}
