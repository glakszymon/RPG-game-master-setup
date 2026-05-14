import { useState } from 'react';
import {
  Button,
  Input,
  Textarea,
  Card,
  Modal,
  ToolWindow,
  Tooltip,
  Badge,
} from './components';
import './App.css';

/**
 * Showcase — strona testowa design systemu.
 *
 * Wyświetla wszystkie komponenty, tokeny, typografię.
 * Użyj do weryfikacji wizualnej przed implementacją właściwego UI.
 *
 * Zamień na prawdziwy App gdy zaczniesz budować Hub/Canvas.
 */
function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toolWindowVisible, setToolWindowVisible] = useState(true);

  return (
    <div className="showcase">
      {/* ── Header ── */}
      <div>
        <h1 className="pageTitle">Game Master Panel</h1>
        <p className="pageSubtitle">Design System Showcase</p>
      </div>

      {/* ── Typografia ── */}
      <section className="section">
        <h2 className="sectionTitle">Typografia</h2>
        <h1>Heading 1 — Michroma</h1>
        <h2>Heading 2 — Michroma</h2>
        <h3>Heading 3 — Michroma</h3>
        <h4>Heading 4 — Michroma</h4>
        <p>
          Body text — Exo 2. Lorem ipsum dolor sit amet, consectetur adipiscing
          elit. Vestibulum ante ipsum primis in faucibus.
        </p>
        <small>Small / muted text — Exo 2 14px</small>
        <p>
          <code>code — JetBrains Mono</code>
        </p>
      </section>

      {/* ── Kolory ── */}
      <section className="section">
        <h2 className="sectionTitle">Paleta kolorów</h2>
        <div className="grid">
          <div className="colorSwatch">
            <div className="swatchDot" style={{ background: '#C9B06B' }} />
            --color-accent: #C9B06B
          </div>
          <div className="colorSwatch">
            <div className="swatchDot" style={{ background: '#E8E6E3' }} />
            --color-text-primary
          </div>
          <div className="colorSwatch">
            <div className="swatchDot" style={{ background: '#4ADE80' }} />
            --color-success
          </div>
          <div className="colorSwatch">
            <div className="swatchDot" style={{ background: '#F87171' }} />
            --color-error
          </div>
          <div className="colorSwatch">
            <div className="swatchDot" style={{ background: '#FBBF24' }} />
            --color-warning
          </div>
          <div className="colorSwatch">
            <div className="swatchDot" style={{ background: '#60A5FA' }} />
            --color-info
          </div>
        </div>
      </section>

      {/* ── Buttons ── */}
      <section className="section">
        <h2 className="sectionTitle">Buttons</h2>
        <div className="row">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className="row">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
        <div className="row">
          <Button disabled>Disabled</Button>
          <Tooltip content="To jest tooltip!">
            <Button variant="secondary" iconOnly aria-label="Info">
              ?
            </Button>
          </Tooltip>
        </div>
      </section>

      {/* ── Badges ── */}
      <section className="section">
        <h2 className="sectionTitle">Badges</h2>
        <div className="row">
          <Badge>Default</Badge>
          <Badge variant="accent">Accent</Badge>
          <Badge variant="success">Active</Badge>
          <Badge variant="error">Dead</Badge>
          <Badge variant="warning">Stunned</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </section>

      {/* ── Inputs ── */}
      <section className="section">
        <h2 className="sectionTitle">Inputs</h2>
        <div className="grid">
          <Input label="Nazwa postaci" placeholder="Wpisz nazwę..." />
          <Input label="HP" type="number" placeholder="0" />
          <Input label="Z błędem" error="To pole jest wymagane" />
          <Input label="Wyłączone" disabled value="Disabled" />
        </div>
        <Textarea label="Opis" placeholder="Opisz postać..." rows={3} />
      </section>

      {/* ── Cards ── */}
      <section className="section">
        <h2 className="sectionTitle">Cards (Glassmorphism)</h2>
        <div className="grid">
          <Card>
            <h3>Surface Card</h3>
            <p>Domyślna karta — delikatny glass effect.</p>
          </Card>
          <Card variant="elevated">
            <h3>Elevated Card</h3>
            <p>Mocniejszy blur — do wyróżnionych elementów.</p>
          </Card>
          <Card interactive>
            <h3>Interactive Card</h3>
            <p>Hover = złoty glow. Kliknij mnie!</p>
          </Card>
          <Card glow>
            <h3>Glow Card</h3>
            <p>Stały accent glow — aktywny element.</p>
          </Card>
        </div>
      </section>

      {/* ── ToolWindow ── */}
      <section className="section">
        <h2 className="sectionTitle">ToolWindow</h2>
        <div className="row">
          <Button
            variant="secondary"
            onClick={() => setToolWindowVisible(true)}
          >
            Pokaż ToolWindow
          </Button>
        </div>
        {toolWindowVisible && (
          <div className="toolWindowDemo">
            <ToolWindow
              title="Party Tracker"
              icon="⚔️"
              active
              onClose={() => setToolWindowVisible(false)}
            >
              <p>Treść okna narzędziowego.</p>
              <p>
                <small>Title bar = drag handle (cursor: grab)</small>
              </p>
              <div className="row" style={{ marginTop: 12 }}>
                <Badge variant="success">Active</Badge>
                <Badge variant="accent">4 Players</Badge>
              </div>
            </ToolWindow>
          </div>
        )}
      </section>

      {/* ── Modal ── */}
      <section className="section">
        <h2 className="sectionTitle">Modal</h2>
        <Button onClick={() => setModalOpen(true)}>Otwórz Modal</Button>
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title="Nowa kampania"
          description="Uzupełnij dane nowej kampanii."
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setModalOpen(false)}
              >
                Anuluj
              </Button>
              <Button onClick={() => setModalOpen(false)}>Zapisz</Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Nazwa kampanii" placeholder="Moja kampania..." />
            <Input label="System RPG" placeholder="D&D 5e, Pathfinder..." />
            <Textarea label="Opis" placeholder="O czym jest kampania?" />
          </div>
        </Modal>
      </section>

      {/* ── Spacing ── */}
      <section className="section">
        <h2 className="sectionTitle">Spacing (4px scale)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((n) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <code style={{ width: 100 }}>--space-{n}</code>
              <div
                style={{
                  width: `var(--space-${n})`,
                  height: 12,
                  background: 'var(--color-accent)',
                  borderRadius: 2,
                  minWidth: n * 4,
                }}
              />
              <small>{n * 4}px</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;
