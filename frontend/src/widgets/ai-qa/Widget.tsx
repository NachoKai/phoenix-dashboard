import { WidgetCard } from '../../components/WidgetCard';
import type { WidgetProps } from '../../types';

export function AiQaWidget({ instance }: WidgetProps) {
  const placeholder = (instance.config.placeholder as string) ?? 'Ask anything...';

  return (
    <WidgetCard title="AI Q&A" status="success" error={null} lastUpdated={null}>
      <div className="ai-qa-widget ai-qa-widget--stub">
        <p className="ai-qa-widget__badge">Coming soon</p>
        <p className="ai-qa-widget__desc">
          LLM-powered Q&A will be a drop-in widget. Configure your API key in settings to prepare.
        </p>
        <input
          type="text"
          className="ai-qa-widget__input"
          placeholder={placeholder}
          disabled
        />
      </div>
    </WidgetCard>
  );
}
