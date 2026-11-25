import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { learningCover } from '../../../../../shared-ui/parity-assets';
import type { StudyDetail } from '../model/study-contracts.ts';
import { studyMasteryLabel, studyNextReview, studyReviewWhen, studyTopicMastery } from '../model/study-mastery.ts';

/** Folder identity, topics with mastery, materials and next review: the left rail of the study workbench. */
export function StudyRail({
  detail,
  classroomName,
  selected,
  disabled,
  sourceCount,
  onTopic,
  onAddMaterial,
}: {
  detail: Pick<StudyDetail, 'folder' | 'sources' | 'practices' | 'exams' | 'scheduledReviewSessions'>;
  classroomName?: string;
  selected: string[];
  disabled: boolean;
  sourceCount: number;
  onTopic: (id: string) => void;
  onAddMaterial: (launcher: HTMLButtonElement) => void;
}) {
  const folder = detail.folder;
  const topics = folder.units.flatMap((unit) => unit.topics);
  const next = studyNextReview(detail);
  const nextTopic = next && topics.find((topic) => topic.id === next.topicId)?.title;
  return (
    <div className="study-rail">
      <header className="study-rail-identity">
        <img src={learningCover(folder.bannerKey)} alt="" />
        <div>
          <strong>{folder.name}</strong>
          <small>{folder.linkedClassroomId ? `Vinculada a ${classroomName ?? 'tu aula'}` : 'Materiales propios'}</small>
        </div>
      </header>
      {folder.units.map((unit) => (
        <section key={unit.id} className="study-rail-unit" aria-label={unit.title}>
          <h3>{unit.title}</h3>
          <ul>
            {unit.topics.map((topic) => {
              const mastery = studyTopicMastery(detail.practices, topic.id);
              const chosen = selected.includes(topic.id);
              return (
                <li key={topic.id}>
                  <button
                    type="button"
                    className="study-rail-topic"
                    aria-pressed={chosen}
                    disabled={disabled}
                    title={chosen ? 'Incluido en tu próximo pedido' : 'Tocá para incluirlo en tu próximo pedido'}
                    onClick={() => onTopic(topic.id)}
                  >
                    <span className="study-rail-topic-title">{topic.title}</span>
                    {mastery.level ? (
                      <span className="study-rail-meter" role="img" aria-label={studyMasteryLabel(mastery)}>
                        {[1, 2, 3].map((step) => <i key={step} className={step <= mastery.level ? 'on' : ''} />)}
                      </span>
                    ) : (
                      <small className="study-rail-unpracticed">Sin practicar</small>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <section className="study-rail-materials" aria-label="Materiales">
        <h3>
          Materiales <b>{sourceCount}</b>
        </h3>
        <button type="button" className="study-rail-add" disabled={disabled} onClick={(event) => onAddMaterial(event.currentTarget)}>
          <FoxmindIcon name="plus" />
          Agregar material
        </button>
      </section>
      {next && (
        <section className="study-rail-review" aria-label="Próximo repaso">
          <h3>Próximo repaso</h3>
          <p>
            <b>{studyReviewWhen(next.startAt, next.timeZone)}</b>
            <span>{[nextTopic ?? next.title, `${next.minutes} min`].join(' · ')}</span>
          </p>
        </section>
      )}
    </div>
  );
}
