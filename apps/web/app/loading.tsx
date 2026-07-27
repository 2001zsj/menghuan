import { Container, Skeleton } from "@menghuan/ui";
export default function LoadingPage() {
  return (
    <Container className="page-shell state-page" aria-label="页面加载中">
      <Skeleton width="8rem" height="1rem" />
      <Skeleton width="min(34rem, 100%)" height="3.5rem" />
      <Skeleton width="min(26rem, 100%)" height="1.25rem" />
    </Container>
  );
}
